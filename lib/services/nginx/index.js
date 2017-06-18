'use strict';
const fs = require('fs-extra');
const url = require('url');
const path = require('path');
const execa = require('execa');
const validator = require('validator');
const Promise = require('bluebird');
const NginxConfFile = require('nginx-conf').NginxConfFile;

const BaseService = require('../base');
const errors = require('../../errors');

const LIVE_URL = 'https://acme-v01.api.letsencrypt.org/directory';
const STAGING_URL = 'https://acme-staging.api.letsencrypt.org/directory';

class NginxService extends BaseService {
    init() {
        this.on('setup', 'setup');
        this.on('uninstall', 'uninstall');
        this.command('nginx-conf', 'setupConf');
        this.command('nginx-ssl', 'setupSSL');
        // TODO implement
        // this.command('ssl-renew', 'renewSSL');
    }

    get parsedUrl() {
        return url.parse(this.config.get('url'));
    }

    setup(context) {
        // This is the result from the `ghost doctor setup` command - it will be false
        // if nginx does not exist on the system
        if (!context.nginx) {
            return;
        }

        if (this.parsedUrl.port) {
            this.ui.log('Your url contains a port. Skipping automatic nginx setup.', 'yellow');
            return;
        }

        if (this.parsedUrl.pathname !== '/') {
            this.ui.log('The Nginx service does not support subdirectory configurations yet. Skipping automatic nginx setup.', 'yellow');
            return;
        }

        if (fs.existsSync(`/etc/nginx/sites-available/${this.parsedUrl.hostname}.conf`)) {
            this.ui.log('Nginx configuration already found for this url. Skipping automatic nginx configuration.', 'yellow');
            return;
        }

        let prompts = [{
            type: 'confirm',
            name: 'ssl',
            message: 'Do you want to set up your blog with SSL (using letsencrypt)?',
            default: true
        }, {
            type: 'input',
            name: 'email',
            message: 'Enter your email (used for ssl registration)',
            when: ans => ans.ssl,
            validate: email => validator.isEmail(email) || 'Invalid email'
        }];

        if (this.config.environment === 'development') {
            prompts.splice(1, 0, {
                type: 'confirm',
                name: 'staging',
                message: 'You are running in development mode. Would you like to use letsencrypt\'s' +
                    ' staging servers instead of the production servers?',
                default: true,
                when: ans => ans.ssl
            });
        }

        let answerPromise;
        let answers;

        if (this.config.get('ssl.email', false)) {
            answerPromise = Promise.resolve({
                ssl: true,
                email: this.config.get('ssl.email')
            });
        } else {
            answerPromise = this.ui.prompt(prompts);
        }

        return answerPromise.then((_answers) => {
            answers = _answers;

            return this.ui.sudo(`ghost service nginx-conf${!answers.ssl ? ' no-ssl' : ''}`).catch((error) => {
                return Promise.reject(new errors.ProcessError(error));
            });
        }).then(() => {
            if (answers.ssl) {
                return this.ui.sudo(`ghost service nginx-ssl ${answers.email}${answers.staging ? ' staging' : ''}`).catch((error) => {
                    return Promise.reject(new errors.ProcessError(error));
                });
            }
        });
    }

    setupConf(ssl) {
        let isSSL = (!ssl || ssl !== 'no-ssl');
        let confFile = `${this.parsedUrl.hostname}.conf`;
        let confFilePath = `/etc/nginx/sites-available/${confFile}`;

        fs.ensureFileSync(confFilePath);
        fs.ensureSymlinkSync(confFilePath, `/etc/nginx/sites-enabled/${confFile}`);

        return Promise.fromNode((cb) => NginxConfFile.create(confFilePath, cb)).then((conf) => {
            conf.nginx._add('server');

            let http = conf.nginx.server;

            http._add('listen', '80');
            http._add('listen', '[::]:80');
            http._add('server_name', this.parsedUrl.hostname);

            let rootPath = path.resolve(process.cwd(), 'root');
            fs.ensureDirSync(rootPath);
            http._add('root', rootPath);

            http._add('location', '/');
            this._addProxyBlock(http.location);

            if (isSSL) {
                http._add('location', '~ /.well-known');
                http.location[1]._add('allow', 'all');
            }
        }).then(() => execa.shell('service nginx restart', {stdio: 'inherit'})).catch((error) => {
            return Promise.reject(new errors.ProcessError(error));
        });
    }

    setupSSL(email, staging) {
        let rootPath = path.resolve(process.cwd(), 'root');

        let command = `${process.execPath} ${path.resolve(__dirname, '../../../node_modules/.bin/greenlock')} certonly` +
            ` --agree-tos --email ${email} --webroot --webroot-path ${rootPath}` +
            ` --config-dir /etc/letsencrypt --domains ${this.parsedUrl.hostname} --server ${staging ? STAGING_URL : LIVE_URL}`;

        return this.ui.run(execa.shell(command, {stdio: 'ignore'}), 'Getting SSL certificate').then(() => {
            if (fs.existsSync('/etc/ssl/certs/dhparam.pem')) {
                // Diffie-Hellman cert already exists, skip
                return;
            }

            return this.ui.run(execa.shell('cd /etc/ssl/certs && openssl dhparam -out dhparam.pem 2048'), 'Generating encryption key (hold tight, this may take a while)').catch((error) => {
                return Promise.reject(new errors.ProcessError(error));
            });
        }).then(() => {
            // The SSL config for Ghost uses an `ssl-params` snippet conf taken from https://cipherli.st
            fs.ensureDirSync('/etc/nginx/snippets');
            fs.copySync(path.resolve(__dirname, 'files/ssl-params.conf'), '/etc/nginx/snippets/ssl-params.conf', {overwrite: false});

            return Promise.fromNode((cb) => NginxConfFile.create(`/etc/nginx/sites-available/${this.parsedUrl.hostname}.conf`, cb));
        }).then((conf) => {
            let http = conf.nginx.server;
            // remove proxy && well-known location from port 80 server block
            http._remove('location');
            // remove root path
            http._remove('root');
            // add 'location /' block with 301 redirect to ssl
            http._add('return', '301 https://$server_name$request_uri');

            // add ssl server block
            conf.nginx._add('server');

            let https = conf.nginx.server[1];
            // add listen directives
            https._add('listen', '443 ssl http2');
            https._add('listen', '[::]:443 ssl http2');
            https._add('server_name', this.parsedUrl.hostname);
            // add ssl cert directives
            https._add('ssl_certificate', `/etc/letsencrypt/live/${this.parsedUrl.hostname}/fullchain.pem`);
            https._add('ssl_certificate_key', `/etc/letsencrypt/live/${this.parsedUrl.hostname}/privkey.pem`);
            // add ssl-params snippet
            https._add('include', 'snippets/ssl-params.conf');
            // add root directive
            https._add('root', rootPath);

            https._add('location', '/');
            this._addProxyBlock(https.location);
            https._add('location', '~ /.well-known');
            https.location[1]._add('allow', 'all');
        }).then(() => execa.shell('service nginx restart', {stdio: 'inherit'})).catch((error) => {
            return Promise.reject(new errors.ProcessError(error));
        });
    }

    _addProxyBlock(location) {
        location._add('proxy_set_header', 'X-Forwarded-For $proxy_add_x_forwarded_for');
        location._add('proxy_set_header', 'X-Forwarded-Proto $scheme');
        location._add('proxy_set_header', 'X-Real-IP $remote_addr');
        location._add('proxy_set_header', 'Host $http_host');
        location._add('proxy_pass', `http://127.0.0.1:${this.config.get('server.port')}`);
    }

    uninstall() {
        let confFile = `${this.parsedUrl.hostname}.conf`;

        if (fs.existsSync(`/etc/nginx/sites-available/${confFile}`)) {
            return this.ui.sudo(`rm /etc/nginx/sites-available/${confFile}`).then(() => {
                return this.ui.sudo(`rm /etc/nginx/sites-enabled/${confFile}`);
            }).catch(() => Promise.reject(new errors.SystemError('Nginx config file could not be removed, you will need to do this manually.')));
        }
    }
};

module.exports = {
    name: 'nginx',
    class: NginxService
};
