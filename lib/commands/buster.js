var BaseCommand = require('./base');

module.exports = BaseCommand.extend({
    name: 'buster',
    description: 'who ya gonna call?',

    execute: function () {
        var npm = require('../utils/npm');

        return this.ui.run(npm(['cache', 'clean']), 'Clearing npm cache');
    }
});
