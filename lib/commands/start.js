var BaseCommand = require('./base');

module.exports = BaseCommand.extend({
    name: 'start',
    description: 'starts a named instance of Ghost',
    arguments: ['name'],

    execute: function (name) {
        console.log('starting an instance of ghost with name: ' + name);
    }
});
