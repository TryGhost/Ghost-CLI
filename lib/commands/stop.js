var BaseCommand = require('./base');

module.exports = {
    name: 'stop',
    description: 'stops a named instance of Ghost'
};

module.exports.Command = BaseCommand.extend({
    execute: function () {
        // ensure we are within a valid ghost install
        this.checkValidInstall();

        var Promise = require('bluebird'),
            Config = require('../utils/config'),
            cliConfig = Config.load('.ghost-cli'),
            resolveProcessManager = require('../process').resolve,
            config, pm;

        if (!cliConfig.has('running')) {
            return Promise.reject('Ghost instance is not currently running.');
        }

        config = Config.load('config.' + cliConfig.get('running') + '.json');
        pm = resolveProcessManager(config);

        return this.ui.run(
            Promise.resolve(pm.stop(process.cwd())),
            'Stopping Ghost instance'
        ).then(function () {
            cliConfig.set('running', null).save();
        });
    }
});
