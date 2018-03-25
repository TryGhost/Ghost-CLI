'use strict';
const Command = require('../command');

class LsCommand extends Command {
    run() {
        const chalk = require('chalk');
        const Promise = require('bluebird');

        return this.system.getAllInstances().then((instances) => {
            return Promise.map(instances, (instance) => {
                return instance.summary().then((summary) => {
                    if (!summary.running) {
                        return [summary.name, summary.dir, summary.version, chalk.red('stopped'), chalk.red('n/a'), chalk.red('n/a'), chalk.red('n/a')];
                    }

                    return [summary.name, summary.dir, summary.version, `${chalk.green('running')} (${summary.mode})`, summary.url, summary.port, summary.process];
                });
            });
        }).then((rows) => {
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
