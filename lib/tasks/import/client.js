// @ts-check
const get = require('lodash/get');

/**
 * Ghost's API returns errors as `{errors: [{message, context}]}`, which is a lot more
 * useful than ky's generic "Request failed with status code 500". Surface the actual
 * error, plus which request failed - ky's message includes neither the method nor the url.
 *
 * @param {import('ky').HTTPError} error
 */
async function describeError(error) {
    const {request, response} = error;
    const body = await response.json().catch(() => null);
    const {message, context, code} = get(body, 'errors[0]', {});
    const detail = [message, context].filter(Boolean).join(' ');
    const {pathname} = new URL(request.url);

    error.message = `${request.method} ${pathname} failed (${response.status})${detail ? `: ${detail}` : ''}`;
    // the response body is consumed here, so keep the code around for callers that need it
    error.code = code;

    return error;
}

// imports and exports can take a long time to generate, so no timeout - ky defaults to 10s
module.exports = require('ky').default.create({
    timeout: false,
    hooks: {
        beforeError: [describeError]
    }
});
