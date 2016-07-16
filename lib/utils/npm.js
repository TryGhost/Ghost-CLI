// Borrowed from Ember-CLI's npm utility

var merge = require('lodash/merge'),
    Promise = require('bluebird');

module.exports = function npm(command, npmArgs, npmConfig) {
    var npm = require('npm'),
        baseConfig = {progress: false},
        load;

    load = Promise.promisify(npm.load);

    // This uses the npm programmatic API (which is somewhat unstable)
    // Certain commands may not work with this: (help is one)
    return load(merge(baseConfig, npmConfig)).then(function () {
        var npmCommand = Promise.promisify(npm.commands[command], {context: npm});

        return npmCommand(npmArgs || []);
    });
};
