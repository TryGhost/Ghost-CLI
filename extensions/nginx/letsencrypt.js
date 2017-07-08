'use strict';
const fs = require('fs-extra');
const os = require('os');
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

    let hostname = url.parse(instance.config.get('url')).hostname;
    let letsencryptFolder = path.join(instance.dir, 'system', 'letsencrypt');
    let fullchain = path.join(letsencryptFolder, 'fullchain.pem');
    let privkey = path.join(letsencryptFolder, 'privkey.pem');

    return downloadPromise.then(() => {
        let rootPath = path.resolve(instance.dir, 'system', 'nginx-root');

        fs.ensureDirSync(letsencryptFolder);

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
            // Certificate already exists
            if (renew) {
                instance.ui.log('Certificate not due for renewal yet, skipping', 'yellow');
                return;
            }

            // We're setting up a new instance, we want to re-use the certs
            let acmeScriptDir = path.join(os.homedir(), '.acme.sh', hostname);

            return Promise.all([
                fs.copy(path.join(acmeScriptDir, 'fullchain.cer'), fullchain),
                fs.copy(path.join(acmeScriptDir, `${hostname}.key`), privkey)
            ]);
        }

        return Promise.reject(new errors.ProcessError(error));
    });
};
