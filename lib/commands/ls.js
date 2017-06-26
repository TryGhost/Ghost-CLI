'use strict';
const os = require('os');
const chalk = require('chalk');
const Command = require('../command');

class LsCommand extends Command {
    run() {
        let summaries = this.system.getInstanceList();

        let rows = summaries.map((summary) => {
            if (!summary.running) {
                return [summary.name, summary.dir, summary.version, chalk.red('stopped'), chalk.red('n/a'), chalk.red('n/a'), chalk.red('n/a')];
            }

            return [summary.name, summary.dir, summary.version, `${chalk.green('running')} (${summary.mode})`, summary.url, summary.port, summary.process];
        });

        this.ui.table(['Name', 'Location', 'Version', 'Status', 'Url', 'Port', 'Process Manager'], rows, {
            style: {head: ['cyan']}
        });
    }
}

LsCommand.description = 'View running ghost processes';
LsCommand.global = true;

module.exports = LsCommand;
