const fs = require('fs-extra');
const got = require('got');
const get = require('lodash/get');
const semver = require('semver');
const FormData = require('form-data');
const {Cookie} = require('tough-cookie');

const {SystemError} = require('../../errors');

const bases = {
    1: '/ghost/api/v0.1',
    2: '/ghost/api/v2/admin',
    3: '/ghost/api/v3/admin'
};

function getBaseUrl(version, url) {
    const basePath = bases[semver.major(version)];

    if (!basePath) {
        throw new SystemError(`Unsupported version: ${version}`);
    }

    return `${url.replace(/\/?$/, '')}${basePath}`;
}

async function isSetup(version, url) {
    const baseUrl = getBaseUrl(version, url);
    const {body} = await got('/authentication/setup/', {baseUrl, json: true});
    return get(body, 'setup[0].status', false);
}

async function setup(version, url, data) {
    const baseUrl = getBaseUrl(version, url);
    const {name, email, password, blogTitle} = data;
    const body = {
        setup: [{name, email, password, blogTitle}]
    };

    await got.post('/authentication/setup/', {baseUrl, body, json: true});
}

async function getAuthOpts(version, url, {username, password}) {
    const baseUrl = getBaseUrl(version, url);

    if (semver.major(version) === 1) {
        const {body: configBody} = await got('/configuration/', {baseUrl, json: true});
        const {clientId, clientSecret} = get(configBody, 'configuration[0]', {});
        const {body: authBody} = await got.post('/authentication/token/', {
            baseUrl,
            json: true,
            form: true,
            body: {
                grant_type: 'password',
                client_id: clientId,
                client_secret: clientSecret,
                username,
                password
            }
        });

        return {
            baseUrl,
            headers: {
                Authorization: `Bearer ${authBody.access_token}`
            }
        };
    }

    const {headers} = await got.post('/session/', {
        baseUrl,
        headers: {
            Origin: url,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({username, password})
    });

    /* istanbul ignore next */
    const cookies = headers['set-cookie'] || [];
    const filteredCookies = cookies.map(Cookie.parse).filter(Boolean).map(c => c.cookieString());

    return {
        baseUrl,
        headers: {
            Origin: url,
            Cookie: filteredCookies
        }
    };
}

async function runImport(version, url, auth, exportFile) {
    const authOpts = await getAuthOpts(version, url, auth);
    const body = new FormData();

    body.append('importfile', fs.createReadStream(exportFile));
    await got.post('/db/', {...authOpts, body});
}

module.exports = {
    getBaseUrl,
    isSetup,
    setup,
    runImport
};
