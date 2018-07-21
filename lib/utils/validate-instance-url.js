'use strict';

const {isURL} = require('validator');
const endsWithGhost = /\/ghost\/?$/i;

module.exports = function validateURL(url) {
    const isValidURL = isURL(url, {require_protocol: true});
    if (!isValidURL) {
        return 'Invalid URL. Your URL should include a protocol, E.g. http://my-ghost-blog.com';
    }

    return (!endsWithGhost.test(url)) || 'Ghost doesn\'t support running in a path that ends with `ghost`';
};
