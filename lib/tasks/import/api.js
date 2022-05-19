const fs = require('fs-extra');
const got = require('got');
const get = require('lodash/get');
const semver = require('semver');
const FormData = require('form-data');
const {Cookie} = require('tough-cookie');

const {promisify} = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);
const fsp = require('fs').promises;

const {SystemError} = require('../../errors');

const bases = {
    1: '/ghost/api/v0.1',
    2: '/ghost/api/v2/admin',
    3: '/ghost/api/v3/admin',
    4: '/ghost/api/v4/admin',
    5: '/ghost/api/admin'
};

function streamFile(url, options, filePath) {
    return pipeline(
        got.stream(url, {...options}),
        fs.createWriteStream(filePath)
    ).catch((err) => {
        fsp.unlink(filePath);
        throw err;
    });
}

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

function handleError(error) {
    const {response} = error;
    if (response.statusCode === 404) {
        throw new SystemError({
            message: 'There is no user with that email address.',
            err: error
        });
    }

    if (response.statusCode === 422) {
        throw new SystemError({
            message: 'Your password is incorrect.',
            err: error
        });
    }

    throw error;
}

async function getAuthOpts(version, url, {username, password}) {
    const baseUrl = getBaseUrl(version, url);

    if (semver.major(version) === 1) {
        const {body: configBody} = await got('/configuration/', {baseUrl, json: true});
        const {clientId, clientSecret} = get(configBody, 'configuration[0]', {});

        try {
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
        } catch (error) {
            handleError(error);
        }
    }

    try {
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
    } catch (error) {
        handleError(error);
    }
}

async function runImport(version, url, auth, exportFile) {
    const authOpts = await getAuthOpts(version, url, auth);
    const body = new FormData();

    body.append('importfile', fs.createReadStream(exportFile));
    await got.post('/db/', {...authOpts, body});
}

async function downloadContentExport(version, url, auth, outputFile) {
    const authOpts = await getAuthOpts(version, url, auth);
    let endpoint = '/db/';

    await streamFile(endpoint, authOpts, outputFile);
}

async function downloadMembersExport(version, url, auth, outputFile) {
    const authOpts = await getAuthOpts(version, url, auth);
    let endpoint = '/members/upload/';

    if (semver.lt(version, '3.20.0')) {
        endpoint = '/members/csv/';
    }

    try {
        await streamFile(endpoint, authOpts, outputFile);
    } catch (error) {
        // Members endpoint may not exist, we can ignore this
        if (error.statusCode !== 404) {
            throw error;
        }
    }
}

module.exports = {
    getBaseUrl,
    isSetup,
    setup,
    runImport,
    downloadContentExport,
    downloadMembersExport
};
