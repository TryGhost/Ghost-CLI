var BaseCommand = require('./base'),
    runProcess = require('../utils/run-process'),
    npm = require('../utils/npm');

module.exports = BaseCommand.extend({
    name: 'buster',
    description: 'who ya gonna call?',

    execute: function () {
        return runProcess(npm('cache', ['clean']), 'Clearing npm cache');
    }
});
