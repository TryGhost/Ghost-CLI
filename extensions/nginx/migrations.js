'use strict';
const fs = require('fs-extra');
const os = require('os');
const url = require('url');
const path = require('path');

const cli = require('../../lib');

function migrateSSL(ctx, migrateTask) {
    const replace = require('replace-in-file');
    const acme = require('./acme');

    const parsedUrl = url.parse(ctx.instance.config.get('url'));
    const confFile = path.join(ctx.instance.dir, 'system', 'files', `${parsedUrl.hostname}-ssl.conf`);
    const rootPath = path.resolve(ctx.instance.dir, 'system', 'nginx-root');

    if (!fs.existsSync(confFile)) {
        return migrateTask.skip('SSL config has not been set up for this domain');
    }

    const originalAcmePath = path.join(os.homedir(), '.acme.sh');

    // 1. parse ~/.acme.sh/account.conf to get the email
    const accountConf = fs.readFileSync(path.join(originalAcmePath, 'account.conf'), {encoding: 'utf8'});
    const parsed = accountConf.match(/ACCOUNT_EMAIL='(.*)'\n/);

    if (!parsed) {
        throw new cli.errors.SystemError('Unable to parse letsencrypt account email');
    }

    return this.ui.listr([{
        // 2. install acme.sh in /etc/letsencrypt if that hasn't been done already
        title: 'Installing acme.sh in new location',
        task: (ctx, task) => acme.install(this.ui, task)
    }, {
        // 3. run install cert for new acme.sh instance
        title: 'Regenerating SSL certificate in new location',
        task: () => acme.generate(this.ui, parsedUrl.hostname, rootPath, parsed[1], false)
    }, {
        // 4. Update cert locations in nginx-ssl.conf
        title: 'Updating nginx config',
        task: () => {
            const acmeFolder = path.join('/etc/letsencrypt', parsedUrl.hostname);

            return replace({
                files: confFile,
                from: [
                    /ssl_certificate .*/,
                    /ssl_certificate_key .*/
                ],
                to: [
                    `ssl_certificate ${path.join(acmeFolder, 'fullchain.cer')};`,
                    `ssl_certificate_key ${path.join(acmeFolder, `${parsedUrl.hostname}.key`)};`
                ]
            });
        }
    }, {
        title: 'Restarting Nginx',
        task: () => this.restartNginx()
    }, {
        // 5. run acme.sh --remove -d domain in old acme.sh directory to remove the old cert from renewal
        title: 'Disabling renewal for old certificate',
        task: () => acme.remove(parsedUrl.hostname, this.ui, originalAcmePath)
    }], false);
}

module.exports = {
    migrateSSL: migrateSSL
};
