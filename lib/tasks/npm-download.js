'use strict';
const fs = require('fs-extra');
const path = require('path');
const Promise = require('bluebird');

const npm = require('../utils/npm');
const move = Promise.promisify(fs.move);
const remove = Promise.promisify(fs.remove);

module.exports = function npmDownload(options) {
    options = options || {};

    if (!options.module) {
        return Promise.reject(new Error('You must specify a module to install.'));
    }

    if (!options.destination) {
        return Promise.reject(new Error('You must specify a destination'));
    }

    let module = options.version ? `${options.module}@${options.version}` : options.module;

    // We need to have a package.json in the current directory -
    // otherwise npm won't install here
    fs.writeJsonSync('package.json', {});

    return npm(['install', module], {
        loglevel: 'error'
    }).then(() => {
        return move(path.join(process.cwd(), 'node_modules', options.module), options.destination);
    }).then(() => {
        return Promise.all([
            remove('node_modules'),
            remove('package.json')
        ]);
    });
};
