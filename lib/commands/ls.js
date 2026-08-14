'use strict';
const Command = require('../command');

class LsCommand extends Command {
    async run(argv = {}) {
        const chalk = require('chalk').default;
        const Promise = require('bluebird');

        function makeRow(summary) {
            const {running, name, dir, version, mode, url, port, process} = summary;

            if (!running) {
                return [name, dir, version, chalk.red('stopped'), chalk.red('n/a'), chalk.red('n/a'), chalk.red('n/a')];
            }

            return [name, dir, version, `${chalk.green('running')} (${mode})`, url, port, process];
        }

        const instances = await this.system.getAllInstances();
        const summaries = await Promise.map(instances, instance => instance.summary());

        if (argv.json) {
            // Stopped instances don't have any runtime info, so null it out to keep the shape consistent
            this.ui.output(summaries.map(({name, dir, version, running, mode, url, port, process}) => ({
                name,
                dir,
                version,
                running,
                mode: mode || null,
                url: url || null,
                port: port || null,
                process: process || null
            })));
            return;
        }

        if (summaries.length) {
            this.ui.table(['Name', 'Location', 'Version', 'Status', 'URL', 'Port', 'Process Manager'], summaries.map(makeRow), {
                style: {head: ['cyan']}
            });
        } else {
            this.ui.log('No installed ghost instances found', 'cyan');
        }
    }
}

LsCommand.description = 'View running ghost processes';
LsCommand.global = true;
LsCommand.options = {
    json: {
        describe: 'Output instance data as JSON',
        type: 'boolean',
        default: false
    }
};

module.exports = LsCommand;
