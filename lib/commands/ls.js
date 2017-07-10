'use strict';
const chalk = require('chalk');
const Command = require('../command');

class LsCommand extends Command {
    run() {
        let instances = this.system.getAllInstances();
        let rows = instances.map((instance) => {
            let summary = instance.summary();

            if (!summary.running) {
                return [summary.name, summary.dir, summary.version, chalk.red('stopped'), chalk.red('n/a'), chalk.red('n/a'), chalk.red('n/a')];
            }

            return [summary.name, summary.dir, summary.version, `${chalk.green('running')} (${summary.mode})`, summary.url, summary.port, summary.process];
        });

        this.ui.table(['Name', 'Location', 'Version', 'Status', 'URL', 'Port', 'Process Manager'], rows, {
            style: {head: ['cyan']}
        });
    }
}

LsCommand.description = 'View running ghost processes';
LsCommand.global = true;

module.exports = LsCommand;
