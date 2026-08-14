'use strict';
const fs = require('node:fs');
const fsp = require('node:fs/promises');

// Files re-saved by an editor can carry a BOM, which JSON.parse chokes on
const parse = contents => JSON.parse(contents.replace(/^\uFEFF/, ''));

/**
 * Reads and parses a JSON file
 *
 * @param {string} file
 * @return {any} parsed contents
 */
function readJSONSync(file) {
    return parse(fs.readFileSync(file, 'utf8'));
}

/**
 * Async variant of readJSONSync
 *
 * @param {string} file
 * @return {Promise<any>} parsed contents
 */
async function readJSON(file) {
    return parse(await fsp.readFile(file, 'utf8'));
}

/**
 * Writes a value as indented JSON, with a trailing newline so the
 * files stay easy to edit by hand
 *
 * @param {string} file
 * @param {any} value
 */
function writeJSONSync(file, value) {
    fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

module.exports = {readJSON, readJSONSync, writeJSONSync};
