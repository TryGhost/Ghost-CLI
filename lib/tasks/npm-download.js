var BaseTask = require('./base'),
    npm = require('../utils/npm');

module.exports = BaseTask.extend({
    name: 'npm-download',
    description: 'Downloading from npm',

    run: function run(options) {
        options = options || {};

        if (!options.module) {
            throw new Error('You must specify a module to install.');
        }

        if (!options.destination) {
            throw new Error('You must specify a destination');
        }

        var Promise = require('bluebird'),
            path = require('path'),
            fs = require('fs-extra'),
            move = Promise.promisify(fs.move),
            module;

        module = options.module;

        if (options.version) {
            module += '@' + options.version;
        }

        // We need to have a package.json in the current directory -
        // otherwise npm won't install here
        fs.writeJsonSync('package.json', {});

        return npm(['install', module], {
            loglevel: 'error'
        }).then(function moveDownloaded() {
            return move(
                path.join(process.cwd(), 'node_modules', options.module),
                options.destination
            );
        }).then(function cleanup() {
            fs.removeSync('node_modules');
            fs.removeSync('package.json');
        });
    }
});
