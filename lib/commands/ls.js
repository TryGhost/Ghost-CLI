'use strict';
const Command = require('../command');

class LsCommand extends Command {
    async run() {
        const chalk = require('chalk');
        const Promise = require('bluebird');

        function makeRow(summary) {
            const {running, name, dir, version, mode, url, port, process} = summary;

            if (!running) {
                return [name, dir, version, chalk.red('stopped'), chalk.red('n/a'), chalk.red('n/a'), chalk.red('n/a')];
            }

            return [name, dir, version, `${chalk.green('running')} (${mode})`, url, port, process];
        }

        const instances = await this.system.getAllInstances();
        const rows = await Promise.map(instances, async (instance) => {
            const summary = await instance.summary();
            return makeRow(summary);
        });

        if (rows.length) {
            this.ui.table(['Name', 'Location', 'Version', 'Status', 'URL', 'Port', 'Process Manager'], rows, {
                style: {head: ['cyan']}
            });
        } else {
            this.ui.log('No installed ghost instances found', 'cyan');
        }
    }
}

LsCommand.description = 'View running ghost processes';
LsCommand.global = true;

module.exports = LsCommand;
