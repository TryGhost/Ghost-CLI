'use strict';
const fs = require('node:fs/promises');
const path = require('path');

// `content` itself is created implicitly - mkdir recursive builds missing parents
const dirs = [
    'versions',
    'content/apps',
    'content/themes',
    'content/data',
    'content/images',
    'content/logs',
    'content/settings',
    'content/media',
    'content/files',
    'content/public'
];

module.exports = async function ensureStructure() {
    const cwd = process.cwd();

    await Promise.all(dirs.map(dir => fs.mkdir(path.resolve(cwd, dir), {recursive: true})));
};
