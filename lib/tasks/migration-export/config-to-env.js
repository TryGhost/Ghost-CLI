'use strict';

// Top-level config sections that describe how Ghost was run *outside* of a
// container. They're either wrong in Docker (paths, process) or supplied by the
// target environment (database, server, url), so they never travel in a bundle.
// `database` is also where the source install's credentials live.
const EXCLUDED_SECTIONS = [
    'database',
    'server',
    'logging',
    'process',
    'paths',
    'url'
];

// Keys whose values are likely to be secrets. We can't drop them - mail auth in
// particular has to travel for the migrated site to send email - but the operator
// should know the bundle needs handling as a secret.
const SENSITIVE_KEY_REGEX = /(pass|secret|token|_key|apikey|credential)/i;

/**
 * Flattens a nested config object into Ghost's `section__key` env var form.
 * Mirrors ghost-docker's `scripts/config-to-env.js`.
 *
 * @param {object} object
 * @param {string} [prefix]
 * @return {{[key: string]: string}}
 */
function flatten(object, prefix = '') {
    const result = {};

    for (const [key, value] of Object.entries(object)) {
        const newKey = prefix ? `${prefix}__${key}` : key;

        if (value === null || value === undefined) {
            continue;
        }

        if (Array.isArray(value)) {
            result[newKey] = JSON.stringify(value);
        } else if (typeof value === 'object') {
            Object.assign(result, flatten(value, newKey));
        } else {
            result[newKey] = value.toString();
        }
    }

    return result;
}

/**
 * Quotes values the way ghost-docker's flattener does, so the importer can write
 * each entry straight into an env file without re-escaping it.
 *
 * @param {string} value
 * @return {string}
 */
function formatValue(value) {
    if (value.includes(' ') || value.includes('\n') || value.includes('"') || value.includes('\'')) {
        // Emitting `\"` for a quote means the consumer processes backslash escapes
        // inside the quotes, so backslashes have to be escaped too - and first.
        // Otherwise a value ending in `\` escapes its own closing quote.
        return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    }

    return value;
}

/**
 * @param {string} key
 * @param {Array<string>} sections
 * @return {boolean}
 */
function isExcluded(key, sections) {
    return sections.some(section => key === section || key.startsWith(`${section}__`));
}

/**
 * Converts a Ghost config object into the flattened, env-var shaped hash that
 * travels in a migration bundle's manifest.
 *
 * @param {object} config Parsed contents of config.<env>.json
 * @return {{[key: string]: string}}
 */
function configToEnv(config) {
    const flattened = flatten(config || {});

    return Object.entries(flattened).reduce((result, [key, value]) => {
        if (isExcluded(key, EXCLUDED_SECTIONS)) {
            return result;
        }

        return {...result, [key]: formatValue(value)};
    }, {});
}

/**
 * Returns the keys of an already-flattened config that look like they hold secrets
 *
 * @param {{[key: string]: string}} env
 * @return {Array<string>}
 */
function sensitiveKeys(env) {
    return Object.keys(env).filter(key => SENSITIVE_KEY_REGEX.test(key));
}

module.exports = {configToEnv, sensitiveKeys, EXCLUDED_SECTIONS};
