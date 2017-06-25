'use strict';
const Command = require('../command');
const yarn = require('../utils/yarn');

class BusterCommand extends Command {
    run() {
        return this.ui.run(yarn(['cache', 'clean']), 'Clearing yarn cache');
    }
}

BusterCommand.description = 'Who ya gonna call?';

module.exports = BusterCommand;
