'use strict';

const {isIP} = require('net');
const endsWithGhost = /\/ghost\/?$/i;
const hasTLD = /^[^.\s]+(\.[^.\s]+)+$/;

// Requires an http(s) protocol and either a TLD, an IP address, or localhost
const isURL = function isURL(input) {
    let parsed;

    try {
        parsed = new URL(input);
    } catch {
        return false;
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return false;
    }

    // IPv6 hostnames are wrapped in square brackets
    const hostname = parsed.hostname.replace(/^\[|]$/g, '');
    return hostname === 'localhost' || isIP(hostname) !== 0 || hasTLD.test(hostname);
};

const validate = function validateURL(url) {
    const isValidURL = isURL(url);
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
