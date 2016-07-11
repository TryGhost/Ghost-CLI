var BaseCommand = require('./base');

module.exports = BaseCommand.extend({
    name: 'buster',
    description: 'busts the npm cache',

    execute: function () {
        console.log('busting the npm cache....');
    }
});
