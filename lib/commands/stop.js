var BaseCommand = require('./base');

module.exports = BaseCommand.extend({
    name: 'stop',
    description: 'stops a named instance of Ghost',
    arguments: ['name'],

    execute: function () {}
});
