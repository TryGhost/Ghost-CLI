var BaseCommand = require('./base');

module.exports = BaseCommand.extend({
    name: 'doctor',
    description: 'check the system for any potential hiccups when installing/updating Ghost',

    execute: function () {}
});
