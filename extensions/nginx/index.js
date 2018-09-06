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

class NginxExtension extends Extension {
    migrations() {
        const migrations = require('./migrations');

        return [{
            before: '1.2.0',
            title: 'Migrating SSL certs',
            skip: () => os.platform() !== 'linux' || !fs.existsSync(path.join(os.homedir(), '.acme.sh')),
            task: migrations.migrateSSL.bind(this)
        }];
    }

    setup(cmd, argv) {
        // ghost setup --local, skip
        if (argv.local) {
            return;
        }

        cmd.addStage('nginx', this.setupNginx.bind(this), null, 'Nginx');
        cmd.addStage('ssl', this.setupSSL.bind(this), 'nginx', 'SSL');
    }

    setupNginx(argv, ctx, task) {
        if (!this.isSupported()) {
            this.ui.log('Nginx is not installed. Skipping Nginx setup.', 'yellow');
            return task.skip();
        }

        const parsedUrl = url.parse(ctx.instance.config.get('url'));

        if (parsedUrl.port) {
            this.ui.log('Your url contains a port. Skipping Nginx setup.', 'yellow');
            return task.skip();
        }

        const confFile = `${parsedUrl.hostname}.conf`;

        if (fs.existsSync(`/etc/nginx/sites-available/${confFile}`)) {
            this.ui.log('Nginx configuration already found for this url. Skipping Nginx setup.', 'yellow');
            return task.skip();
        }

        const conf = template(fs.readFileSync(path.join(__dirname, 'templates', 'nginx.conf'), 'utf8'));

        const rootPath = path.resolve(ctx.instance.dir, 'system', 'nginx-root');

        const generatedConfig = conf({
            url: parsedUrl.hostname,
            webroot: rootPath,
            location: parsedUrl.pathname !== '/' ? `^~ ${parsedUrl.pathname}` : '/',
            port: ctx.instance.config.get('server.port')
        });

        return this.template(
            ctx.instance,
            generatedConfig,
            'nginx config',
            confFile,
            '/etc/nginx/sites-available'
        ).then(
            () => this.ui.sudo(`ln -sf /etc/nginx/sites-available/${confFile} /etc/nginx/sites-enabled/${confFile}`)
        ).then(
            () => this.restartNginx()
        ).catch(
            (error) => {
                // CASE: error is already a cli error, just pass it along
                if (error instanceof CliError) {
                    return Promise.reject(error);
                }

                return Promise.reject(new ProcessError(error));
            });
    }

    setupSSL(argv, ctx, task) {
        const parsedUrl = url.parse(ctx.instance.config.get('url'));
        const confFile = `${parsedUrl.hostname}-ssl.conf`;

        if (isIP(parsedUrl.hostname)) {
            this.ui.log('SSL certs cannot be generated for IP addresses, skipping', 'yellow');
            return task.skip();
        }

        if (fs.existsSync(`/etc/nginx/sites-available/${confFile}`)) {
            this.ui.log('SSL has already been set up, skipping', 'yellow');
            return task.skip();
        }

        if (!argv.prompt && !argv.sslemail) {
            this.ui.log('SSL email must be provided via the --sslemail option, skipping SSL setup', 'yellow');
            return task.skip();
        }

        if (!fs.existsSync(`/etc/nginx/sites-available/${parsedUrl.hostname}.conf`)) {
            if (ctx.single) {
                this.ui.log('Nginx config file does not exist, skipping SSL setup', 'yellow');
            }

            return task.skip();
        }

        const acme = require('./acme');

        const rootPath = path.resolve(ctx.instance.dir, 'system', 'nginx-root');
        const dhparamFile = '/etc/nginx/snippets/dhparam.pem';
        const sslParamsFile = '/etc/nginx/snippets/ssl-params.conf';
        const sslParamsConf = template(fs.readFileSync(path.join(__dirname, 'templates', 'ssl-params.conf'), 'utf8'));

        return this.ui.listr([{
            title: 'Checking DNS resolution',
            task: ctx => Promise.fromNode(cb => dns.lookup(parsedUrl.hostname, {family: 4}, cb)).catch((error) => {
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

                this.ui.log(text.join(' '), 'yellow');
                ctx.dnsfail = true;
            })
        }, {
            title: 'Getting additional configuration',
            skip: ({dnsfail}) => dnsfail,
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
            skip: ({dnsfail}) => dnsfail,
            task: (ctx, task) => acme.install(this.ui, task)
        }, {
            title: 'Getting SSL Certificate from Let\'s Encrypt',
            skip: ({dnsfail}) => dnsfail,
            task: () => acme.generate(this.ui, parsedUrl.hostname, rootPath, argv.sslemail, argv.sslstaging)
        }, {
            title: 'Generating Encryption Key (may take a few minutes)',
            skip: ({dnsfail}) => dnsfail || fs.existsSync(dhparamFile),
            task: () => this.ui.sudo(`openssl dhparam -out ${dhparamFile} 2048`)
                .catch(error => Promise.reject(new ProcessError(error)))
        }, {
            title: 'Generating SSL security headers',
            skip: ({dnsfail}) => dnsfail || fs.existsSync(sslParamsFile),
            task: () => {
                const tmpfile = path.join(os.tmpdir(), 'ssl-params.conf');

                return fs.writeFile(tmpfile, sslParamsConf({dhparam: dhparamFile}), {encoding: 'utf8'})
                    .then(() => this.ui.sudo(`mv ${tmpfile} ${sslParamsFile}`).catch(
                        error => Promise.reject(new ProcessError(error))
                    ));
            }
        }, {
            title: 'Generating SSL configuration',
            skip: ({dnsfail}) => dnsfail,
            task: (ctx) => {
                const acmeFolder = path.join('/etc/letsencrypt', parsedUrl.hostname);
                const sslConf = template(fs.readFileSync(path.join(__dirname, 'templates', 'nginx-ssl.conf'), 'utf8'));
                const generatedSslConfig = sslConf({
                    url: parsedUrl.hostname,
                    webroot: rootPath,
                    fullchain: path.join(acmeFolder, 'fullchain.cer'),
                    privkey: path.join(acmeFolder, `${parsedUrl.hostname}.key`),
                    sslparams: sslParamsFile,
                    location: parsedUrl.pathname !== '/' ? `^~ ${parsedUrl.pathname}` : '/',
                    port: ctx.instance.config.get('server.port')
                });

                return this.template(
                    ctx.instance,
                    generatedSslConfig,
                    'ssl config',
                    confFile,
                    '/etc/nginx/sites-available'
                ).then(
                    () => this.ui.sudo(`ln -sf /etc/nginx/sites-available/${confFile} /etc/nginx/sites-enabled/${confFile}`)
                ).catch(error => Promise.reject(new ProcessError(error)));
            }
        }, {
            title: 'Restarting Nginx',
            skip: ({dnsfail}) => dnsfail,
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

        if (fs.existsSync(`/etc/nginx/sites-available/${confFile}`)) {
            // Nginx config exists, remove it
            promises.push(
                Promise.all([
                    this.ui.sudo(`rm -f /etc/nginx/sites-available/${confFile}`),
                    this.ui.sudo(`rm -f /etc/nginx/sites-enabled/${confFile}`)
                ]).catch(error => Promise.reject(new CliError({
                    message: `Nginx config file link could not be removed, you will need to do this manually for /etc/nginx/sites-available/${confFile}.`,
                    help: `Try running 'rm -f /etc/nginx/sites-available/${confFile} && rm -f /etc/nginx/sites-enabled/${confFile}'`,
                    err: error
                })))
            );
        }

        if (fs.existsSync(`/etc/nginx/sites-available/${sslConfFile}`)) {
            // SSL config exists, remove it
            promises.push(
                Promise.all([
                    this.ui.sudo(`rm -f /etc/nginx/sites-available/${sslConfFile}`),
                    this.ui.sudo(`rm -f /etc/nginx/sites-enabled/${sslConfFile}`)
                ]).catch(error => Promise.reject(new CliError({
                    message: `SSL config file link could not be removed, you will need to do this manually for /etc/nginx/sites-available/${sslConfFile}.`,
                    help: `Try running 'rm -f /etc/nginx/sites-available/${sslConfFile} && rm -f /etc/nginx/sites-enabled/${sslConfFile}'`,
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
        return this.ui.sudo('nginx -s reload')
            .catch(error => Promise.reject(new CliError({
                message: 'Failed to restart Nginx.',
                err: error
            })));
    }

    isSupported() {
        try {
            execa.shellSync('dpkg -l | grep nginx', {stdio: 'ignore'});
            return true;
        } catch (e) {
            return false;
        }
    }
}

module.exports = NginxExtension;
