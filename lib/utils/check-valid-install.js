'use strict';
const path = require('path');
const fs = require('fs-extra');
const Config = require('./config');

module.exports = function checkValidInstall(name) {
    if (fs.existsSync(path.join(process.cwd(), 'package.json')) &&
        fs.readJsonSync(path.join(process.cwd(), 'package.json')).name === 'ghost' &&
        fs.existsSync(path.join(process.cwd(), 'gulpfile.js'))) {
        console.error('Ghost-CLI commands do not work inside of a clone or direct download.\n' +
        `Perhaps you meant 'gulp ${name}'?`);
        process.exit(1);
    }

    if (!Config.exists(path.join(process.cwd(), '.ghost-cli'))) {
        console.error('Working directory is not a valid Ghost installation. ' +
        `Please run 'ghost ${name}' again within a valid Ghost installation.`);

        process.exit(1);
    }
};
