// @ts-check
const got = require('got');
const get = require('lodash/get');
const {Cookie} = require('tough-cookie');

/**
 * Performs authentication against the v1 Ghost API
 * @param {string} prefixUrl
 * @param {object} options
 * @param {string} options.username
 * @param {string} options.password
 */
async function v1AuthStrategy(prefixUrl, {username, password}) {
    const {body: configBody} = await got('configuration/', {prefixUrl, responseType: 'json'});
    const {clientId, clientSecret} = get(configBody, 'configuration[0]', {});

    const {body: authBody} = await got.post('authentication/token/', {
        prefixUrl,
        responseType: 'json',
        form: {
            grant_type: 'password',
            client_id: clientId,
            client_secret: clientSecret,
            username,
            password
        }
    });

    return {
        prefixUrl,
        headers: {
            Authorization: `Bearer ${authBody.access_token}`
        }
    };
}

/**
 * Performs authentication against the v2+ Ghost API using a session-based strategy
 * @param {string} prefixUrl
 * @param {object} options
 * @param {string} options.origin
 * @param {string} options.username
 * @param {string} options.password
 */
async function sessionAuthStrategy(prefixUrl, {origin, username, password}) {
    const {headers} = await got.post('session/', {
        prefixUrl,
        headers: {origin},
        json: {username, password}
    });

    /* istanbul ignore next */
    const cookies = headers['set-cookie'] || [];
    const filteredCookies = cookies.map(Cookie.parse).filter(Boolean).map(c => c.cookieString());

    return {
        prefixUrl,
        headers: {
            origin,
            Cookie: filteredCookies
        }
    };
}

/**
 * Performs authentication against the v2+ Ghost API using an Admin token-based strategy
 */
async function tokenAuthStrategy(prefixUrl, {token}) {
    const jwt = require('jsonwebtoken');
    const [id, secret] = token.split(':');
    const authToken = jwt.sign({}, Buffer.from(secret, 'hex'), {
        keyid: id,
        algorithm: 'HS256',
        expiresIn: '5m',
        audience: '/admin/'
    });

    return {
        prefixUrl,
        headers: {
            Authorization: `Ghost ${authToken}`
        }
    };
}

module.exports = {
    v1AuthStrategy,
    sessionAuthStrategy,
    tokenAuthStrategy
};
