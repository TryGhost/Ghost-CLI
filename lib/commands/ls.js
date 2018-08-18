'use strict';
const Command = require('../command');

class LsCommand extends Command {
    run() {
        const chalk = require('chalk');
        const Promise = require('bluebird');

        function makeRow(summary) {
            const {running, name, dir, version, mode, url, port, process} = summary;

            if (!running) {
                return [name, dir, version, chalk.red('stopped'), chalk.red('n/a'), chalk.red('n/a'), chalk.red('n/a')];
            }

            return [name, dir, version, `${chalk.green('running')} (${mode})`, url, port, process];
        }

        return this.system.getAllInstances().then(
            instances => Promise.map(instances, instance => instance.summary().then(makeRow))
        ).then((rows) => {
            if (rows.length) {
                this.ui.table(['Name', 'Location', 'Version', 'Status', 'URL', 'Port', 'Process Manager'], rows, {
                    style: {head: ['cyan']}
                });
            } else {
                this.ui.log('No installed ghost instances found', 'cyan');
            }
        });
    }
}

LsCommand.description = 'View running ghost processes';
LsCommand.global = true;

module.exports = LsCommand;
