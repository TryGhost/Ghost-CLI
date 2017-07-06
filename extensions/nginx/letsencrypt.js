'use strict';
const fs = require('fs-extra');
const url = require('url');
const path = require('path');
const execa = require('execa');
const download = require('download');

const errors = require('../../lib').errors;

// This is how we will do version control for acme.sh
const ACME_VERSION = '2.7.2';

module.exports = function letsencrypt(instance, email, staging, renew) {
    let downloadPromise;
    let acmePath = path.join(instance.dir, 'system', 'acme.sh');

    if (fs.existsSync(acmePath)) {
        downloadPromise = Promise.resolve();
    } else {
        let acmeUrl = `https://raw.githubusercontent.com/Neilpang/acme.sh/${ACME_VERSION}/acme.sh`;
        downloadPromise = download(acmeUrl).then(data => fs.writeFile(acmePath, data, {mode: 0o755}));
    }

    return downloadPromise.then(() => {
        let hostname = url.parse(instance.config.get('url')).hostname;
        let rootPath = path.resolve(instance.dir, 'system', 'nginx-root');
        let letsencryptFolder = path.join(instance.dir, 'system', 'letsencrypt');

        fs.ensureDirSync(letsencryptFolder);

        let fullchain = path.join(letsencryptFolder, 'fullchain.pem');
        let privkey = path.join(letsencryptFolder, 'privkey.pem');

        let cmd = `${acmePath} --${renew ? 'renew' : 'issue'} --domain ${hostname} --webroot ${rootPath} ` +
            `--accountemail ${email} --key-file ${privkey} --fullchain-file ${fullchain}${staging ? ' --staging' : ''}`;

        return execa.shell(cmd);
    }).catch((error) => {
        if (!error.cmd) {
            // if cmd not set, we got an error from `download`
            return Promise.reject(new errors.SystemError(error.message));
        }

        // This is an execa error
        if (error.stdout.match(/Skip/)) {
            this.ui.log('Certificate not due for renewal yet, skipping', 'yellow');
            return;
        }

        return Promise.reject(new errors.ProcessError(error));
    });;
};
