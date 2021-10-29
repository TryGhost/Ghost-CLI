'use strict';
const fs = require('fs-extra');
const os = require('os');
const got = require('got');
const path = require('path');
const download = require('download');

const {errors: {CliError, ProcessError, SystemError}} = require('../../lib');
const {errorWrapper} = require('./utils');

const nginxProgramName = process.env.NGINX_PROGRAM_NAME || 'nginx';

function isInstalled() {
    return fs.existsSync('/etc/letsencrypt/acme.sh');
}

async function install(ui) {
    if (isInstalled()) {
        await ui.sudo('/etc/letsencrypt/acme.sh --upgrade --home /etc/letsencrypt');
        return;
    }

    const acmeTmpDir = path.join(os.tmpdir(), 'acme.sh');
    const acmeApiUrl = 'https://api.github.com/repos/Neilpang/acme.sh/releases/latest';

    ui.logVerbose('ssl: creating /etc/letsencrypt directory', 'green');

    // acme.sh creates the directory without global read permissions, so we need to make
    // sure it has global read permissions first
    await ui.sudo('mkdir -p /etc/letsencrypt');
    ui.logVerbose('ssl: downloading acme.sh to temporary directory', 'green');
    await fs.emptyDir(acmeTmpDir);

    let downloadURL;

    try {
        downloadURL = JSON.parse((await got(acmeApiUrl)).body).tarball_url;
    } catch (error) {
        throw new CliError({
            message: 'Unable to fetch download URL from GitHub',
            err: error
        });
    }

    await download(downloadURL, acmeTmpDir, {extract: true});
    // The archive contains a single folder with the structure
    //  `{user}-{repo}-{commit}`, but we don't know what commit is
    //  from the API call. Since the dir is empty (we cleared it),
    //  the only thing in acmeTmpDir will be the extracted zip.
    const acmeCodeDir = path.resolve(acmeTmpDir, fs.readdirSync(acmeTmpDir)[0]);

    ui.logVerbose('ssl: installing acme.sh components', 'green');

    // Installs acme.sh into /etc/letsencrypt
    await ui.sudo('./acme.sh --install --home /etc/letsencrypt', {cwd: acmeCodeDir});
}

async function generateCert(ui, domain, webroot, email, staging) {
    const parts = [
        '/etc/letsencrypt/acme.sh',
        '--issue',
        '--home /etc/letsencrypt',
        '--server letsencrypt',
        `--domain ${domain}`,
        `--webroot ${webroot}`,
        `--reloadcmd "${nginxProgramName} -s reload"`,
        `--accountemail ${email}`
    ];

    if (staging) {
        parts.push('--staging');
    }

    const cmd = parts.join(' ');

    try {
        await ui.sudo(cmd);
    } catch (error) {
        if (error.code === 2) {
            // error code 2 is given if a cert doesn't need to be renewed
            return;
        }

        if (error.stderr.match(/Verify error:(Fetching|Invalid Response)/)) {
            // Domain verification failed
            throw new SystemError('Your domain name is not pointing to the correct IP address of your server, check your DNS has propagated and run `ghost setup ssl` again');
        }

        // It's not an error we expect might happen, throw a ProcessError instead.
        throw new ProcessError(error);
    }
}

async function remove(domain, ui, acmeHome) {
    acmeHome = acmeHome || '/etc/letsencrypt';

    const cmd = `${acmeHome}/acme.sh --remove --home ${acmeHome} --domain ${domain}`;

    try {
        await ui.sudo(cmd);
    } catch (error) {
        throw new ProcessError(error);
    }
}

module.exports = {
    install: errorWrapper(install),
    isInstalled: isInstalled,
    generate: generateCert,
    remove: remove
};
