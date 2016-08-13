var BaseCommand = require('./base'),
    npm = require('../utils/npm');

module.exports = BaseCommand.extend({
    name: 'buster',
    description: 'who ya gonna call?',

    execute: function () {
        return this.ui.run(npm(['cache', 'clean']), 'Clearing npm cache');
    }
});
