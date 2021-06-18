'use strict';
const Command = require('../command');

class BusterCommand extends Command {
    run() {
        const yarn = require('../utils/yarn');

        return this.ui.run(yarn(['cache', 'clean']), 'Clearing yarn cache');
    }
}

BusterCommand.description = 'Who ya gonna call? (Runs `yarn cache clean`)';
BusterCommand.longDescription = 'When there\'s something strange in your neighborhood....';
BusterCommand.global = true;

module.exports = BusterCommand;
