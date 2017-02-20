'use strict';
const fs = require('fs-extra');
const url = require('url');
const path = require('path');
const execa = require('execa');
const template = require('lodash/template');
const validator = require('validator');

const BaseService = require('../base');

class NginxService extends BaseService {
    init() {
        this.on('setup', 'setup');
    }

    get parsedUrl() {
        return url.parse(this.config.get('url'));
    }

    setup(context) {
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

        let answers;

        return this.ui.prompt(prompts).then((_answers) => {
            answers = _answers;

            fs.ensureDirSync(path.join(process.cwd(), 'root'));

            let conf = template(fs.readFileSync(path.join(__dirname, 'files', 'site.conf.template'), 'utf8'));
            let confFile = `${this.parsedUrl.hostname}.conf`;

            fs.writeFileSync(path.join(process.cwd(), confFile), conf({
                ssl: answers.ssl,
                root: path.join(process.cwd(), 'root'),
                url: this.parsedUrl.hostname,
                port: this.config.get('server.port')
            }));

            return this.ui.noSpin(execa.shell(`sudo mv ${confFile} /etc/nginx/sites-available && ` +
                `sudo ln -s /etc/nginx/sites-available/${confFile} /etc/nginx/sites-enabled`, {stdio: 'inherit'}));
        }).then(() => {
            if (answers.ssl) {
                return this._sslConf();
            }
        }).then(() => this._restartNginx()).then(() => {
            if (answers.ssl) {
                return this._sslCert(answers);
            }
        });
    }

    _sslConf() {
        // Because the ssl snippets are still in the nginx main config file, we need to make the ssl configs exist
        // before restarting nginx and generating the letsencrypt cert
        return this.ui.noSpin(execa.shell(`sudo touch /etc/nginx/snippets/${this.parsedUrl.hostname}.conf`).then(() => {
            if (fs.existsSync('/etc/nginx/snippets/ssl-params.conf')) {
                return;
            }

            return this.ui.noSpin(execa.shell(
                `sudo mv ${path.join(__dirname, 'files', 'ssl-params.conf')} /etc/nginx/snippets`,
                {stdio: 'inherit'}
            ));
        }));
    }

    _sslCert(options) {
        let letsencrypt = path.resolve(__dirname, '../../../node_modules/.bin/letsencrypt')
        let command = `sudo ${letsencrypt} certonly --agree-tos --email ${options.email} --webroot ` +
            `--webroot-path ${path.join(process.cwd(), 'root')} --config-dir /etc/letsencrypt ` +
            `--domains ${this.parsedUrl.hostname}`;

        if (options.staging) {
            // Use LetsEncrypt's staging server
            command += ' --server https://acme-staging.api.letsencrypt.org/directory';
        }

        return this.ui.noSpin(execa.shell(command, {stdio: 'inherit'})).then(() => {
            let sslConf = template(fs.readFileSync(path.join(__dirname, 'files', 'ssl-cert.conf.template'), 'utf8'));
            let sslConfFile = `ssl-${this.parsedUrl.hostname}.conf`;

            fs.writeFileSync(path.join(process.cwd(), sslConfFile), sslConf({
                url: this.parsedUrl.hostname
            }));

            return this.ui.noSpin(execa.shell(`sudo mv ${sslConfFile} /etc/nginx/snippets`, {stdio: 'inherit'}));
        }).then(() => this._restartNginx());
    }

    _restartNginx() {
        return this.ui.noSpin(execa.shell('sudo service nginx restart', {stdio: 'inherit'}));
    }
}

module.exports = {
    name: 'nginx',
    class: NginxService
};
