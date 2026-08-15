'use strict';

/**
 * Minimal dot-notation object accessors. Only supports plain string paths
 * (e.g. `database.connection.filename`), which is all the CLI config uses.
 */

const toPath = key => String(key).split('.');
const isIndexable = value => value !== null && (typeof value === 'object' || typeof value === 'function');

/**
 * Gets a nested value from an object
 *
 * @param {Object} obj
 * @param {string} key Dot-separated path
 * @param {any} defaultValue Returned if the path doesn't resolve
 * @return {any}
 */
function get(obj, key, defaultValue) {
    const value = toPath(key).reduce(
        (current, segment) => (isIndexable(current) ? current[segment] : undefined),
        obj
    );

    return value === undefined ? defaultValue : value;
}

/**
 * Sets a nested value on an object, creating any missing intermediate objects
 *
 * @param {Object} obj
 * @param {string} key Dot-separated path
 * @param {any} value
 * @return {Object} The passed in object
 */
function set(obj, key, value) {
    const path = toPath(key);
    const lastSegment = path.pop();

    const target = path.reduce((current, segment) => {
        if (!isIndexable(current[segment])) {
            current[segment] = {};
        }

        return current[segment];
    }, obj);

    target[lastSegment] = value;
    return obj;
}

/**
 * Checks whether an object has a value at the given path
 *
 * @param {Object} obj
 * @param {string} key Dot-separated path
 * @return {boolean}
 */
function has(obj, key) {
    let current = obj;

    for (const segment of toPath(key)) {
        if (!isIndexable(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
            return false;
        }

        current = current[segment];
    }

    return true;
}

module.exports = {get, set, has};
