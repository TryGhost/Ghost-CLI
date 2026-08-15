// @ts-check
const get = require('lodash/get');
const path = require('path');
const semver = require('semver');

const {Readable} = require('node:stream');
const {pipeline} = require('node:stream/promises');
const {openAsBlob, createWriteStream} = require('node:fs');
const fsp = require('node:fs/promises');

// imports and exports can take a long time to generate, so no timeout - ky defaults to 10s
const ky = require('ky').default.create({timeout: false});

const {SystemError} = require('../../errors');
const {v1AuthStrategy, sessionAuthStrategy, tokenAuthStrategy} = require('./api-auth-strategies.js');

const TOKEN_AUTH_MIN_VERSION = '5.129.0';

const bases = {
    1: '/ghost/api/v0.1',
    2: '/ghost/api/v2/admin',
    3: '/ghost/api/v3/admin',
    4: '/ghost/api/v4/admin',
    5: '/ghost/api/admin',
    6: '/ghost/api/admin'
};

async function streamFile(url, options, filePath) {
    // ky throws before anything is written, so only a failed pipe can leave a partial file
    const {body} = await ky(url, options);

    try {
        await pipeline(Readable.fromWeb(body), createWriteStream(filePath));
    } catch (err) {
        await fsp.unlink(filePath).catch(() => {});
        throw err;
    }
}

function getBaseUrl(version, url) {
    const basePath = bases[semver.major(version)];

    if (!basePath) {
        throw new SystemError(`Unsupported version: ${version}`);
    }

    return `${url.replace(/\/?$/, '')}${basePath}`;
}

async function isSetup(version, url) {
    const prefixUrl = getBaseUrl(version, url);
    const body = await ky('authentication/setup/', {prefixUrl}).json();
    return get(body, 'setup[0].status', false);
}

async function setup(version, url, data) {
    const prefixUrl = getBaseUrl(version, url);
    const {name, email, password, blogTitle} = data;
    const json = {
        setup: [{name, email, password, blogTitle}]
    };

    await ky.post('authentication/setup/', {prefixUrl, json});
}

function wrapAuthRequest(request) {
    return request.catch((error) => {
        const {response} = error;
        if (!response) {
            throw error;
        }

        if (response.status === 404) {
            throw new SystemError({
                message: 'There is no user with that email address.',
                err: error
            });
        }

        if (response.status === 422) {
            throw new SystemError({
                message: 'Your password is incorrect.',
                err: error
            });
        }

        throw error;
    });
}

/**
 * @param {string} version
 * @param {string} url
 * @param {{username: string; password: string} | {token: string}} auth
 */
async function getAuthOpts(version, url, auth) {
    const prefixUrl = getBaseUrl(version, url);

    if (semver.major(version) === 1) {
        if ('token' in auth) {
            throw new SystemError({message: 'Ghost 1.0 does not support token-based authentication'});
        }

        return wrapAuthRequest(v1AuthStrategy(prefixUrl, auth));
    }

    if ('token' in auth) {
        if (semver.lt(version, TOKEN_AUTH_MIN_VERSION)) {
            throw new SystemError({message: `Token auth is only supported for Ghost v${TOKEN_AUTH_MIN_VERSION} and above`});
        }

        return wrapAuthRequest(tokenAuthStrategy(prefixUrl, auth));
    }

    return wrapAuthRequest(sessionAuthStrategy(prefixUrl, {origin: url, ...auth}));
}

async function runImport(version, url, auth, exportFile) {
    const authOpts = await getAuthOpts(version, url, auth);
    const body = new FormData();

    // exports are always JSON, and Ghost picks the importer based on the part's filename
    body.append('importfile', await openAsBlob(exportFile, {type: 'application/json'}), path.basename(exportFile));
    await ky.post('db/', {...authOpts, body});
}

async function downloadContentExport(version, url, auth, outputFile) {
    const authOpts = await getAuthOpts(version, url, auth);
    let endpoint = 'db/';

    await streamFile(endpoint, authOpts, outputFile);
}

async function downloadMembersExport(version, url, auth, outputFile) {
    const authOpts = await getAuthOpts(version, url, auth);
    let endpoint = 'members/upload/?limit=all';

    if (semver.lt(version, '3.20.0')) {
        endpoint = 'members/csv/';
    }

    try {
        await streamFile(endpoint, authOpts, outputFile);
    } catch (error) {
        // Members endpoint may not exist, we can ignore this
        if (error.response?.status !== 404) {
            throw error;
        }
    }
}

module.exports = {
    TOKEN_AUTH_MIN_VERSION,
    getBaseUrl,
    isSetup,
    setup,
    runImport,
    downloadContentExport,
    downloadMembersExport
};
