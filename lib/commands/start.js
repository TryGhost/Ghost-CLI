var BaseCommand = require('./base');

module.exports = BaseCommand.extend({
    name: 'start',
    description: 'starts a named instance of Ghost',

    arguments: [{
        name: 'name',
        optional: true
    }],
    options: [{
        name: 'development',
        alias: 'D',
        description: 'Start ghost in development mode',
        flag: true
    }, {
        name: 'production',
        alias: 'P',
        description: 'Start ghost in production mode',
        flag: true
    }],

    // TODO: this currently only supports pm2 process running.
    // This should be extended to support custom methods of stopping/starting
    // ghost
    execute: function (name, options) {
        // ensure we are within a valid ghost install
        this.checkValidInstall();

        var Promise = require('bluebird'),
            path = require('path'),
            pm2 = Promise.promisifyAll(require('pm2')),
            Config = require('../utils/config'),
            config = new Config('.ghost-cli'),

            ghostCwd = path.join(process.cwd(), 'current'),
            script = path.join(ghostCwd, 'index.js'),
            self = this,
            env = {};

        name = name || config.get('name');
        options = options || {};
        env.NODE_ENV = (options.production || !options.development) ? 'production' : 'development';

        return this.ui.run(
            pm2.connectAsync().then(function afterConnect() {
                return pm2.startAsync({script: script, name: name, cwd: ghostCwd, env: env});
            }).then(function afterStart(processes) {
                var startedProcess = processes[0];

                if (startedProcess.pm2_env.name !== config.get('name')) {
                    config.set('name', startedProcess.pm2_env.name).save();
                }

                return pm2.disconnectAsync();
            }),
            'Starting Ghost instance'
        );
    }
});
