var BaseCommand = require('./base');

module.exports = {
    name: 'restart',
    description: 'Restart the Ghost instance'
};

module.exports.Command = BaseCommand.extend({
    execute: function () {
        this.checkValidInstall();

        var Promise = require('bluebird'),
            Config = require('../utils/config'),
            config = Config.load('.ghost-cli'),
            self = this,
            startConfig = {};

        if (!config.has('running')) {
            return Promise.reject('Ghost instance is not currently running.');
        }

        startConfig[config.get('running')] = true;

        return this.runCommand('stop').then(function restart() {
            return self.runCommand('start', startConfig);
        });
    }
});
