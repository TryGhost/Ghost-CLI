'use strict';

/**
 * Runs an async function over each item in series, in place of Promise.each
 *
 * @param {Array} items
 * @param {Function} fn
 */
module.exports = async function each(items, fn) {
    for (const item of items) {
        await fn(item);
    }
};
