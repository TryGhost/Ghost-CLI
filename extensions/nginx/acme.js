'use strict';
const fs = require('fs-extra');
const os = require('os');
const got = require('got');
const path = require('path');
const download = require('download');

const {errors: {CliError, ProcessError, SystemError}} = require('../../lib');

const nginxProgramName = process.env.NGINX_PROGRAM_NAME || 'nginx';

function isInstalled() {
    return fs.existsSync('/etc/letsencrypt/acme.sh');
}

function install(ui, task) {
    if (isInstalled()) {
        return task.skip('acme.sh is already installed');
    }

    const acmeTmpDir = path.join(os.tmpdir(), 'acme.sh');
    const acmeApiUrl = 'https://api.github.com/repos/Neilpang/acme.sh/releases/latest';

    ui.logVerbose('ssl: creating /etc/letsencrypt directory', 'green');

    // acme.sh creates the directory without global read permissions, so we need to make
    // sure it has global read permissions first
    return ui.sudo('mkdir -p /etc/letsencrypt').then(() => {
        ui.logVerbose('ssl: downloading acme.sh to temporary directory', 'green');
        return fs.emptyDir(acmeTmpDir);
    }).then(() => got(acmeApiUrl)).then((response) => {
        try {
            response = JSON.parse(response.body).tarball_url;
        } catch (e) {
            return Promise.reject(new CliError({
                message: 'Unable to parse Github api response for acme',
                err: e
            }));
        }

        return download(response, acmeTmpDir, {extract: true});
    }).then(() => {
        // The archive contains a single folder with the structure
        //  `{user}-{repo}-{commit}`, but we don't know what commit is
        //  from the API call. Since the dir is empty (we cleared it),
        //  the only thing in acmeTmpDir will be the extracted zip.
        const acmeCodeDir = path.resolve(acmeTmpDir, fs.readdirSync(acmeTmpDir)[0]);

        ui.logVerbose('ssl: installing acme.sh components', 'green');

        // Installs acme.sh into /etc/letsencrypt
        return ui.sudo('./acme.sh --install --home /etc/letsencrypt', {cwd: acmeCodeDir});
    }).catch((error) => {
        // CASE: error is already a cli error, just pass it along
        if (error instanceof CliError) {
            return Promise.reject(error);
        }

        // catch any request errors first, which isn't a ProcessError
        if (!error.stderr) {
            return Promise.reject(new CliError({
                message: 'Unable to query GitHub for ACME download URL',
                err: error
            }));
        }
        return Promise.reject(new ProcessError(error));
    });
}

function generateCert(ui, domain, webroot, email, staging) {
    const cmd = `/etc/letsencrypt/acme.sh --issue --home /etc/letsencrypt --domain ${domain} --webroot ${webroot} ` +
    `--reloadcmd "${nginxProgramName} -s reload" --accountemail ${email}${staging ? ' --staging' : ''}`;

    return ui.sudo(cmd).catch((error) => {
        if (error.code === 2) {
            // error code 2 is given if a cert doesn't need to be renewed
            return Promise.resolve();
        }

        if (error.stderr.match(/Verify error:(Fetching|Invalid Response)/)) {
            // Domain verification failed
            return Promise.reject(new SystemError('Your domain name is not pointing to the correct IP address of your server, check your DNS has propagated and run `ghost setup ssl` again'));
        }

        // It's not an error we expect might happen, throw a ProcessError instead.
        return Promise.reject(new ProcessError(error));
    });
}

function remove(domain, ui, acmeHome) {
    acmeHome = acmeHome || '/etc/letsencrypt';

    const cmd = `${acmeHome}/acme.sh --remove --home ${acmeHome} --domain ${domain}`;

    return ui.sudo(cmd).catch(error => Promise.reject(new ProcessError(error)));
}

module.exports = {
    install: install,
    isInstalled: isInstalled,
    generate: generateCert,
    remove: remove
};
