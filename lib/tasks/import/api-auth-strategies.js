// @ts-check
const {Cookie} = require('tough-cookie');

// imports and exports can take a long time to generate, so no timeout - ky defaults to 10s
const ky = require('ky').default.create({timeout: false});

/**
 * Performs authentication against the v1 Ghost API
 * @param {string} prefixUrl
 * @param {object} options
 * @param {string} options.username
 * @param {string} options.password
 */
async function v1AuthStrategy(prefixUrl, {username, password}) {
    const configBody = await ky('configuration/', {prefixUrl}).json();
    const {clientId, clientSecret} = configBody?.configuration?.[0] ?? {};

    const authBody = await ky.post('authentication/token/', {
        prefixUrl,
        body: new URLSearchParams({
            grant_type: 'password',
            client_id: clientId,
            client_secret: clientSecret,
            username,
            password
        })
    }).json();

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
    const {headers} = await ky.post('session/', {
        prefixUrl,
        headers: {origin},
        json: {username, password}
    });

    const cookies = headers.getSetCookie();
    const filteredCookies = cookies.map(Cookie.parse).filter(Boolean).map(c => c.cookieString());

    return {
        prefixUrl,
        headers: {
            origin,
            Cookie: filteredCookies.join('; ')
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
