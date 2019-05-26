'use strict';

const fs = require('fs-extra');
const os = require('os');
const dns = require('dns');
const url = require('url');
const isIP = require('validator/lib/isIP');
const path = require('path');
const execa = require('execa');
const Promise = require('bluebird');
const template = require('lodash/template');

const {Extension, errors} = require('../../lib');
const {CliError, ProcessError} = errors;

const nginxConfigPath = process.env.NGINX_CONFIG_PATH || '/etc/nginx';
const nginxProgramName = process.env.NGINX_PROGRAM_NAME || 'nginx';

class NginxExtension extends Extension {
    migrations() {
        const migrations = require('./migrations');

        return [{
            before: '1.2.0',
            title: 'Migrating SSL certs',
            skip: () => !this.system.platform.linux || !fs.existsSync(path.join(os.homedir(), '.acme.sh')),
            task: migrations.migrateSSL.bind(this)
        }];
    }

    setup() {
        // ghost setup --local, skip
        const enabled = ({argv}) => !argv.local;

        return [{
            id: 'nginx',
            name: 'Nginx',
            task: (...args) => this.setupNginx(...args),
            enabled,
            skip: ({instance}) => {
                if (!this.isSupported()) {
                    return 'Nginx is not installed. Skipping Nginx setup.';
                }

                const {port, hostname} = url.parse(instance.config.get('url'));

                if (port) {
                    return 'Your url contains a port. Skipping Nginx setup.';
                }

                const confFile = `${hostname}.conf`;

                if (fs.existsSync(`${nginxConfigPath}/sites-available/${confFile}`)) {
                    return 'Nginx configuration already found for this url. Skipping Nginx setup.';
                }

                return false;
            }
        }, {
            id: 'ssl',
            name: 'SSL',
            enabled,
            task: (...args) => this.setupSSL(...args),
            skip: ({tasks, instance, argv, single}) => {
                if (tasks.nginx.isSkipped()) {
                    return 'Nginx setup task was skipped, skipping SSL setup';
                }

                if (tasks.nginx.hasFailed()) {
                    return 'Nginx setup task failed, skipping SSL setup';
                }

                const {hostname} = url.parse(instance.config.get('url'));
                const confFile = `${hostname}-ssl.conf`;

                if (isIP(hostname)) {
                    return 'SSL certs cannot be generated for IP addresses, skipping';
                }

                if (fs.existsSync(`${nginxConfigPath}/sites-available/${confFile}`)) {
                    return 'SSL has already been set up, skipping';
                }

                if (!argv.prompt && !argv.sslemail) {
                    return 'SSL email must be provided via the --sslemail option, skipping SSL setup';
                }

                if (!fs.existsSync(`${nginxConfigPath}/sites-available/${hostname}.conf`)) {
                    return single ? 'Nginx config file does not exist, skipping SSL setup' : true;
                }

                return false;
            }
        }];
    }

    setupNginx({instance}) {
        const {hostname, pathname} = url.parse(instance.config.get('url'));
        const conf = template(fs.readFileSync(path.join(__dirname, 'templates', 'nginx.conf'), 'utf8'));

        const rootPath = path.resolve(instance.dir, 'system', 'nginx-root');
        const confFile = `${hostname}.conf`;

        const generatedConfig = conf({
            url: hostname,
            webroot: rootPath,
            location: pathname !== '/' ? `^~ ${pathname}` : '/',
            port: instance.config.get('server.port')
        });

        return this.template(instance, generatedConfig, 'nginx config', confFile, `${nginxConfigPath}/sites-available`).then(
            () => this.ui.sudo(`ln -sf ${nginxConfigPath}/sites-available/${confFile} ${nginxConfigPath}/sites-enabled/${confFile}`)
        ).then(
            () => this.restartNginx()
        ).catch((error) => {
            // CASE: error is already a cli error, just pass it along
            if (error instanceof CliError) {
                return Promise.reject(error);
            }

            return Promise.reject(new ProcessError(error));
        });
    }

    setupSSL({instance, argv}) {
        const parsedUrl = url.parse(instance.config.get('url'));
        const confFile = `${parsedUrl.hostname}-ssl.conf`;

        const acme = require('./acme');

        const rootPath = path.resolve(instance.dir, 'system', 'nginx-root');
        const dhparamFile = `${nginxConfigPath}/snippets/dhparam.pem`;
        const sslParamsFile = `${nginxConfigPath}/snippets/ssl-params.conf`;
        const sslParamsConf = template(fs.readFileSync(path.join(__dirname, 'templates', 'ssl-params.conf'), 'utf8'));

        return this.ui.listr([{
            title: 'Checking DNS resolution',
            task: () => Promise.fromNode(cb => dns.lookup(parsedUrl.hostname, {family: 4}, cb)).catch((error) => {
                if (error.code !== 'ENOTFOUND') {
                    // Some other error
                    return Promise.reject(new CliError({
                        message: `Error trying to lookup DNS for '${parsedUrl.hostname}'`,
                        err: error
                    }));
                }

                // DNS entry has not populated yet, log an error and skip rest of the
                // ssl configuration
                const text = [
                    'Uh-oh! It looks like your domain isn\'t set up correctly yet.',
                    'Because of this, SSL setup won\'t work correctly. Once you\'ve set up your domain',
                    'and pointed it at this server\'s IP, try running `ghost setup ssl` again.'
                ];
                return Promise.reject(new CliError({
                    message: text.join('\n'),
                    task: 'Setting up SSL'
                }));
            })
        }, {
            title: 'Getting additional configuration',
            task: () => {
                let promise;

                if (argv.sslemail) {
                    promise = Promise.resolve(argv.sslemail);
                } else {
                    promise = this.ui.prompt({
                        name: 'email',
                        type: 'input',
                        message: 'Enter your email (For SSL Certificate)',
                        validate: value => Boolean(value) || 'You must supply an email'
                    }).then(({email}) => {
                        argv.sslemail = email;
                    });
                }

                return promise;
            }
        }, {
            title: 'Installing acme.sh',
            task: (ctx, task) => acme.install(this.ui, task)
        }, {
            title: 'Getting SSL Certificate from Let\'s Encrypt',
            task: () => acme.generate(this.ui, parsedUrl.hostname, rootPath, argv.sslemail, argv.sslstaging)
        }, {
            title: 'Generating Encryption Key (may take a few minutes)',
            skip: () => fs.existsSync(dhparamFile),
            task: () => this.ui.sudo(`openssl dhparam -out ${dhparamFile} 2048`)
                .catch(error => Promise.reject(new ProcessError(error)))
        }, {
            title: 'Generating SSL security headers',
            skip: () => fs.existsSync(sslParamsFile),
            task: () => {
                const tmpfile = path.join(os.tmpdir(), 'ssl-params.conf');

                return fs.writeFile(tmpfile, sslParamsConf({dhparam: dhparamFile}), {encoding: 'utf8'})
                    .then(() => this.ui.sudo(`mv ${tmpfile} ${sslParamsFile}`).catch(
                        error => Promise.reject(new ProcessError(error))
                    ));
            }
        }, {
            title: 'Generating SSL configuration',
            task: () => {
                const acmeFolder = path.join('/etc/letsencrypt', parsedUrl.hostname);
                const sslConf = template(fs.readFileSync(path.join(__dirname, 'templates', 'nginx-ssl.conf'), 'utf8'));
                const generatedSslConfig = sslConf({
                    url: parsedUrl.hostname,
                    webroot: rootPath,
                    fullchain: path.join(acmeFolder, 'fullchain.cer'),
                    privkey: path.join(acmeFolder, `${parsedUrl.hostname}.key`),
                    sslparams: sslParamsFile,
                    location: parsedUrl.pathname !== '/' ? `^~ ${parsedUrl.pathname}` : '/',
                    port: instance.config.get('server.port')
                });

                return this.template(instance, generatedSslConfig, 'ssl config', confFile, `${nginxConfigPath}/sites-available`).then(
                    () => this.ui.sudo(`ln -sf ${nginxConfigPath}/sites-available/${confFile} ${nginxConfigPath}/sites-enabled/${confFile}`)
                ).catch(error => Promise.reject(new ProcessError(error)));
            }
        }, {
            title: 'Restarting Nginx',
            task: () => this.restartNginx()
        }], false);
    }

    uninstall({config}) {
        const instanceUrl = config.get('url');

        if (!instanceUrl) {
            return Promise.resolve();
        }

        const parsedUrl = url.parse(instanceUrl);
        const confFile = `${parsedUrl.hostname}.conf`;
        const sslConfFile = `${parsedUrl.hostname}-ssl.conf`;

        const promises = [];

        if (fs.existsSync(`${nginxConfigPath}/sites-available/${confFile}`)) {
            // Nginx config exists, remove it
            promises.push(
                Promise.all([
                    this.ui.sudo(`rm -f ${nginxConfigPath}/sites-available/${confFile}`),
                    this.ui.sudo(`rm -f ${nginxConfigPath}/sites-enabled/${confFile}`)
                ]).catch(error => Promise.reject(new CliError({
                    message: `Nginx config file link could not be removed, you will need to do this manually for ${nginxConfigPath}/sites-available/${confFile}.`,
                    help: `Try running 'rm -f ${nginxConfigPath}/sites-available/${confFile} && rm -f ${nginxConfigPath}/sites-enabled/${confFile}'`,
                    err: error
                })))
            );
        }

        if (fs.existsSync(`${nginxConfigPath}/sites-available/${sslConfFile}`)) {
            // SSL config exists, remove it
            promises.push(
                Promise.all([
                    this.ui.sudo(`rm -f ${nginxConfigPath}/sites-available/${sslConfFile}`),
                    this.ui.sudo(`rm -f ${nginxConfigPath}/sites-enabled/${sslConfFile}`)
                ]).catch(error => Promise.reject(new CliError({
                    message: `SSL config file link could not be removed, you will need to do this manually for ${nginxConfigPath}/sites-available/${sslConfFile}.`,
                    help: `Try running 'rm -f ${nginxConfigPath}/sites-available/${sslConfFile} && rm -f ${nginxConfigPath}/sites-enabled/${sslConfFile}'`,
                    err: error
                })))
            );
        }

        if (!promises.length) {
            return Promise.resolve();
        }

        return Promise.all(promises).then(() => this.restartNginx());
    }

    restartNginx() {
        return this.ui.sudo(`${nginxProgramName} -s reload`)
            .catch(error => Promise.reject(new CliError({
                message: 'Failed to restart Nginx.',
                err: error
            })));
    }

    isSupported() {
        try {
            execa.shellSync(`dpkg -l | grep ${nginxProgramName}`, {stdio: 'ignore'});
            return true;
        } catch (e) {
            return false;
        }
    }
}

module.exports = NginxExtension;
