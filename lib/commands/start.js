var BaseCommand = require('./base');

module.exports = BaseCommand.extend({
    name: 'start',
    description: 'starts a named instance of Ghost',

    arguments: [{
        name: 'name',
        optional: true
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

            ghostCwd = path.join(process.cwd(), 'current'),
            script = path.join(ghostCwd, 'index.js'),
            self = this,
            env = {};

        name = name || this.config.get('name');
        options = options || {};

        return this.ui.run(
            pm2.connectAsync().then(function afterConnect() {
                return pm2.startAsync({script: script, name: name, cwd: ghostCwd, env: env});
            }).then(function afterStart(processes) {
                var startedProcess = processes[0];

                if (startedProcess.pm2_env.name !== self.config.get('name')) {
                    self.config.set('name', startedProcess.pm2_env.name).save();
                }

                return pm2.disconnectAsync();
            }),
            'Starting Ghost instance'
        );
    }
});
