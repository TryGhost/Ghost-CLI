var BaseCommand = require('./base');

module.exports = {
    name: 'buster',
    description: 'who ya gonna call?'
};

module.exports.Command = BaseCommand.extend({
    execute: function () {
        var npm = require('../utils/npm');

        return this.ui.run(npm(['cache', 'clean']), 'Clearing npm cache');
    }
});
