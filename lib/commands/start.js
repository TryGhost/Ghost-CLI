var BaseCommand = require('./base');

module.exports = BaseCommand.extend({
    name: 'start',
    description: 'starts a named instance of Ghost',
    arguments: ['name'],

    // TODO: this currently only supports pm2 process running.
    // This should be extended to support custom methods of stopping/starting
    // ghost
    execute: function (name) {
        var Promise = require('bluebird'),
            path = require('path'),
            pm2 = Promise.promisifyAll(require('pm2')),

            ghostCwd = path.join(process.cwd(), 'current'),
            script = path.join(ghostCwd, 'index.js');

        return pm2.connectAsync().then(function afterConnect() {
            return pm2.startAsync({script: script, name: name, cwd: ghostCwd});
        }).then(function afterStart() {
            return pm2.disconnectAsync();
        });
    }
});
