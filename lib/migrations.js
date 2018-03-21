'use strict';

function ensureSettingsFolder() {
    const cwd = process.cwd();
    const fs = require('fs-extra');
    const path = require('path');

    fs.ensureDirSync(path.resolve(cwd, 'content', 'settings'));
}

module.exports = [{
    before: '1.7.0',
    title: 'Create content/settings directory',
    task: ensureSettingsFolder
}];
