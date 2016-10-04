var BaseCommand = require('./base');

module.exports = BaseCommand.extend({
    name: 'setup',
    description: 'setup an installation of Ghost (after it is installed)',

    options: [{
        name: 'local',
        alias: 'l',
        description: 'Quick setup for a local installation of Ghost',
        flag: true
    }],

    init: function (program) {
        // Command is being run as a top-level command, go ahead and mount
        // the advanced options
        if (program) {
            var advancedOptions = require('./config/advanced');

            this.options = this.options.concat(advancedOptions);
        }

        this._super.apply(this, arguments);
    },

    execute: function (options) {
        var local = options.local || false,
            self = this,
            Promise = require('bluebird'),
            config;

        delete options.local;

        config = (local) ? Promise.resolve() : this.runCommand('config', null, null, options);

        return config.then(function afterConfig() {
            // If 'local' is specified we will automatically start ghost
            if (local) {
                return Promise.resolve({start: true});
            }

            return self.ui.prompt({
                type: 'confirm',
                name: 'start',
                message: 'Do you want to start Ghost?',
                default: true
            });
        }).then(function shouldWeStart(answer) {
            if (!answer.start) {
                return Promise.resolve();
            }

            return self.runCommand('start', {development: local});
        });
    }
});
