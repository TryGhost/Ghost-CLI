'use strict';

const fs = require('fs-extra');
const url = require('url');
const path = require('path');
const execa = require('execa');
const template = require('lodash/template');

const Promise = require('bluebird');
const NginxConfFile = require('nginx-conf').NginxConfFile;

const cli = require('../../lib');

const LIVE_URL = 'https://acme-v01.api.letsencrypt.org/directory';
const STAGING_URL = 'https://acme-staging.api.letsencrypt.org/directory';

class NginxExtension extends cli.Extension {
    get parsedUrl() {
        if (!this._parsedUrl) {
            this._parsedUrl = url.parse(this.instance.config.get('url'));
        }

        return this._parsedUrl;
    }

    setup(cmd, argv) {
        // ghost setup --local, skip
        if (argv.local) {
            return;
        }

        cmd.addStage('nginx', this.setupNginx.bind(this));
        cmd.addStage('ssl', this.setupSSL.bind(this));
    }

    setupNginx(argv, ctx, task) {
        if (!this.isSupported()) {
            this.ui.log('Nginx is not installed. Skipping nginx setup.', 'yellow');
            return task && task.skip();
        }

        if (this.parsedUrl.port) {
            this.ui.log('Your url contains a port. Skipping nginx setup.', 'yellow');
            return task && task.skip();
        }

        if (this.parsedUrl.pathname !== '/') {
            this.ui.log('The Nginx service does not support subdirectory configurations yet. Skipping nginx setup.', 'yellow');
            return task && task.skip();
        }

        if (fs.existsSync(`/etc/nginx/sites-available/${this.parsedUrl.hostname}.conf`)) {
            this.ui.log('Nginx configuration already found for this url. Skipping nginx configuration.', 'yellow');
            return task && task.skip();
        }

        return Promise.fromNode((cb) => NginxConfFile.createFromSource('', cb)).then((conf) => {
            conf.nginx._add('server');

            let http = conf.nginx.server;

            http._add('listen', '80');
            http._add('listen', '[::]:80');
            http._add('server_name', this.parsedUrl.hostname);

            let rootPath = path.resolve(ctx.instance.dir, 'system', 'nginx-root');
            fs.ensureDirSync(rootPath);
            http._add('root', rootPath);

            http._add('location', '/');
            this._addProxyBlock(http.location, ctx.instance.config.get('server.port'));

            let confFile = `${this.parsedUrl.hostname}.conf`;

            return ctx.instance.template(
                conf.toString(),
                'nginx config',
                confFile,
                '/etc/nginx/sites-available'
            ).then((generated) => {
                if (!generated) {
                    this.ui.log('Nginx config not generated', 'yellow');
                    return;
                }

                ctx.instance.cliConfig.set('extension.nginx', true).save();

                return this.ui.sudo(`ln -sf /etc/nginx/sites-available/${confFile} /etc/nginx/sites-enabled/${confFile}`)
                    .then(() => this.restartNginx());
            });
        });
    }

    setupSSL(argv, ctx, task) {
        if (!argv.prompt && !argv.sslemail) {
            this.ui.log('SSL email must be provided via the --sslemail option, skipping ssl configuration', 'yellow');
            return task && task.skip();
        }

        let confFile = `${this.parsedUrl.hostname}.conf`;
        let nginxConfPath = path.join(ctx.instance.dir, 'system', 'files', confFile);

        if (!fs.existsSync(nginxConfPath)) {
            if (ctx.single) {
                this.ui.log('Nginx config file does not exist, skipping SSL setup', 'yellow');
            }

            return task && task.skip();
        }

        let rootPath = path.resolve(ctx.instance.dir, 'system', 'nginx-root');

        return this.ui.listr([{
            title: 'Preparing nginx for SSL configuration',
            task: (ctx) => {
                return argv.sslemail ? Promise.resolve({email: argv.sslemail}) : this.ui.prompt({
                    name: 'email',
                    type: 'input',
                    message: 'Enter your email (used for SSL certificate generation)',
                    validate: value => Boolean(value) || 'You must supply an email'
                }).then((answer) => {
                    argv.sslemail = answer.email;

                    ctx.ssl = {};

                    return Promise.fromNode((cb) => NginxConfFile.create(nginxConfPath, cb)).then((conf) => {
                        ctx.ssl.conf = conf;
                        ctx.ssl.http = conf.nginx.server;
                        ctx.ssl.http._add('location', '~ /.well-known');
                        ctx.ssl.http.location[1]._add('allow', 'all');
                    });
                });
            }
        }, {
            title: 'Restarting Nginx',
            task: () => this.restartNginx()
        }, {
            title: 'Getting SSL Certificate',
            task: () => {
                let letsencryptFolder = path.join(ctx.instance.dir, 'system', 'letsencrypt');
                let sslGenArgs = `certonly --agree-tos --email ${argv.sslemail} --webroot --webroot-path ${rootPath}` +
                    ` --config-dir ${letsencryptFolder} --domains ${this.parsedUrl.hostname} --server ${argv.sslStaging ? STAGING_URL : LIVE_URL}`;

                return execa('greenlock', sslGenArgs.split(' '), {
                    stdio: 'ignore',
                    preferLocal: true,
                    localDir: __dirname
                }).catch((error) => Promise.reject(new cli.errors.ProcessError(error)));
            }
        }, {
            title: 'Generating Encryption Key (may take a few minutes)',
            task: (ctx) => {
                ctx.ssl.dhparamOutFile = path.join(ctx.instance.dir, 'system', 'files', 'dhparam.pem');
                return execa.shell(`openssl dhparam -out ${ctx.ssl.dhparamOutFile} 2048`)
                    .catch((error) => Promise.reject(new cli.errors.ProcessError(error)));
            }
        }, {
            title: 'Writing SSL parameters',
            task: (ctx) => {
                let sslParamsTemplate = template(fs.readFileSync(path.join(__dirname, 'ssl-params.conf.template'), 'utf8'));
                return ctx.instance.template(sslParamsTemplate({
                    dhparam: ctx.ssl.dhparamOutFile
                }), 'ssl parameters', 'ssl-params.conf');
            }
        }, {
            title: 'Finising nginx configuration',
            task: (ctx) => {
                // remove proxy && well-known location from port 80 server block
                ctx.ssl.http._remove('location');
                // remove root path
                ctx.ssl.http._remove('root');
                // add 'location /' block with 301 redirect to ssl
                ctx.ssl.http._add('return', '301 https://$server_name$request_uri');

                // add ssl server block
                ctx.ssl.conf.nginx._add('server');
                let https = ctx.ssl.conf.nginx.server[1];

                // add listen directives
                https._add('listen', '443 ssl http2');
                https._add('listen', '[::]:443 ssl http2');
                https._add('server_name', this.parsedUrl.hostname);

                let letsencryptPath = path.join(ctx.instance.dir, 'system', 'letsencrypt', 'live');

                // add ssl cert directives
                https._add('ssl_certificate', path.join(letsencryptPath, this.parsedUrl.hostname, 'fullchain.pem'));
                https._add('ssl_certificate_key', path.join(letsencryptPath, this.parsedUrl.hostname, 'privkey.pem'));
                // add ssl-params snippet
                https._add('include', path.join(ctx.instance.dir, 'system', 'files', 'ssl-params.conf'));
                // add root directive
                https._add('root', rootPath);

                https._add('location', '/');
                this._addProxyBlock(https.location, ctx.instance.config.get('server.port'));

                https._add('location', '~ /.well-known');
                https.location[1]._add('allow', 'all');

                ctx.instance.cliConfig.set('extension.ssl', true)
                    .set('extension.sslemail', argv.sslemail).save();
            }
        }, {
            title: 'Restarting Nginx',
            task: () => this.restartNginx()
        }], false);
    }

    _addProxyBlock(location, port) {
        location._add('proxy_set_header', 'X-Forwarded-For $proxy_add_x_forwarded_for');
        location._add('proxy_set_header', 'X-Forwarded-Proto $scheme');
        location._add('proxy_set_header', 'X-Real-IP $remote_addr');
        location._add('proxy_set_header', 'Host $http_host');
        location._add('proxy_pass', `http://127.0.0.1:${port}`);
    }

    uninstall(instance) {
        if (!instance.cliConfig.get('extension.nginx', false)) {
            return;
        }

        let confFile = `${this.parsedUrl.hostname}.conf`;

        if (fs.existsSync(`/etc/nginx/sites-available/${confFile}`)) {
            return this.ui.sudo(`rm /etc/nginx/sites-available/${confFile}`).then(() => {
                return this.ui.sudo(`rm /etc/nginx/sites-enabled/${confFile}`);
            }).catch(() => Promise.reject(new cli.errors.SystemError('Nginx config file link could not be removed, you will need to do this manually.')));
        }
    }

    restartNginx() {
        return this.ui.sudo('service nginx restart')
            .catch((error) => Promise.reject(new cli.errors.ProcessError(error)));
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
