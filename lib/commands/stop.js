var BaseCommand = require('./base');

module.exports = BaseCommand.extend({
    name: 'stop',
    description: 'stops a named instance of Ghost',

    // TODO: this currently only supports pm2 process running.
    // This should be extended to support custom methods of stopping/starting
    // ghost
    execute: function () {
        // ensure we are within a valid ghost install
        this.checkValidInstall();

        var Promise = require('bluebird'),
            Config = require('../utils/config'),
            cliConfig = new Config('.ghost-cli'),
            resolveProcessManager = require('../process').resolve,
            config, pm;

        if (!cliConfig.has('running')) {
            return Promise.reject('Ghost instance is not currently running.');
        }

        config = new Config('config.' + cliConfig.get('running') + '.json');
        pm = resolveProcessManager(config);

        return this.ui.run(
            Promise.resolve(pm.stop(process.cwd())),
            'Stopping Ghost instance'
        ).then(function () {
            cliConfig.set('running', null).save();
        });
    }
});
