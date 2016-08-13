var BaseCommand = require('./base');

module.exports = BaseCommand.extend({
    name: 'stop',
    description: 'stops a named instance of Ghost',
    arguments: ['name'],

    // TODO: this currently only supports pm2 process running.
    // This should be extended to support custom methods of stopping/starting
    // ghost
    execute: function (name) {
        var Promise = require('bluebird'),
            pm2 = Promise.promisifyAll(require('pm2'));

        return pm2.connectAsync().then(function afterConnect() {
            return pm2.stopAsync(name);
        }).then(function afterStop() {
            return pm2.disconnectAsync();
        });
    }
});
