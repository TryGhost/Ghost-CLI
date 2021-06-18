'use strict';
const fs = require('fs-extra');
const path = require('path');

module.exports = function ensureStructure() {
    const cwd = process.cwd();

    // Create `versions` directory
    fs.ensureDirSync(path.resolve(cwd, 'versions'));

    // Create `content` directory
    fs.ensureDirSync(path.resolve(cwd, 'content'));

    fs.ensureDirSync(path.resolve(cwd, 'content', 'apps'));
    fs.ensureDirSync(path.resolve(cwd, 'content', 'themes'));
    fs.ensureDirSync(path.resolve(cwd, 'content', 'data'));
    fs.ensureDirSync(path.resolve(cwd, 'content', 'images'));
    fs.ensureDirSync(path.resolve(cwd, 'content', 'logs'));
    fs.ensureDirSync(path.resolve(cwd, 'content', 'settings'));
};
