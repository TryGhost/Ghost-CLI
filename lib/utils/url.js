'use strict';

const {isURL} = require('validator');
const endsWithGhost = /\/ghost\/?$/i;

const validate = function validateURL(url) {
    const isValidURL = isURL(url, {require_protocol: true});
    if (!isValidURL) {
        return 'Invalid domain. Your domain should include a protocol and a TLD, E.g. http://my-ghost-blog.com';
    }

    return (!endsWithGhost.test(url)) || 'Ghost doesn\'t support running in a path that ends with `ghost`';
};

const isCustomDomain = function isCustomDomain(input) {
    // If this is localhost or an IP, it's not a custom domain
    return !(/localhost/.test(input) || /((\d){1,3}\.){3}(\d){1,3}/.test(input));
};

const ensureProtocol = function ensureProtocol(input) {
    let output = input.toLowerCase().trim();
    let proto = '';

    if (!/^http/.test(output)) {
        // Custom domains should always be HTTPS, localhost/IP should be HTTP
        proto = isCustomDomain(output) ? 'https:' : 'http:';

        // If this doesn't start with 2 slashes, add them
        if (!/^\/\//.test(output)) {
            proto = proto + '//';
        }
    }

    return proto + output;
};

module.exports = {
    validate,
    isCustomDomain,
    ensureProtocol
};
