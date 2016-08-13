var BaseCommand = require('./base'),
    Promise = require('bluebird');

module.exports = BaseCommand.extend({
    name: 'doctor',
    description: 'check the system for any potential hiccups when installing/updating Ghost',

    execute: function () {
        // TODO: add more checks :)
        return Promise.resolve();
    }
});
