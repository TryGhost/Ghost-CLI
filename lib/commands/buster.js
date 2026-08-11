'use strict';
const Command = require('../command');

class BusterCommand extends Command {
    async run() {
        const yarn = require('../utils/yarn');
        const pnpm = require('../utils/pnpm');

        await this.ui.run(yarn(['cache', 'clean']), 'Clearing yarn cache');

        try {
            await this.ui.run(pnpm(['store', 'prune']), 'Clearing pnpm store');
        } catch (_) {
            // pnpm may not be installed, ignore errors
        }
    }
}

BusterCommand.description = 'Who ya gonna call? (Clears package manager caches)';
BusterCommand.longDescription = 'When there\'s something strange in your neighborhood....';
BusterCommand.global = true;

module.exports = BusterCommand;
