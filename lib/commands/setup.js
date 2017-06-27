'use strict';
const path  = require('path');

const setupChecks           = require('./doctor/checks/setup');
const StartCommand          = require('./start');
const ConfigCommand         = require('./config');
const Command               = require('../command');

class SetupCommand extends Command {
    static configureOptions(commandName, yargs) {
        yargs = super.configureOptions(commandName, yargs);
        return ConfigCommand.configureOptions('config', yargs);
    }

    run(argv) {
        if (argv.local) {
            argv.url = argv.url || 'http://localhost:2368/';
            argv.pname = argv.pname || 'ghost-local';
            argv.process = 'local';
            argv.stack = false;

            // If the user's already specified a db client, then we won't override it.
            if (!argv.db) {
                argv.db = argv.db || 'sqlite3';
                argv.dbpath = path.join(process.cwd(), 'content/data/ghost-local.db');
            }

            argv.start = true;

            // In the case that the user runs `ghost setup --local`, we want to make
            // sure we're set up in development mode
            this.system.setEnvironment(true, true);
        }

        return this.ui.listr([{
            title: 'Configuring Ghost',
            task: () => this.runCommand(ConfigCommand, argv)
        }, {
            title: 'Running setup checks',
            skip: () => !argv.stack,
            task: () => this.ui.listr(setupChecks, false)
        }, {
            title: 'Finishing setup',
            task: (ctx) => {
                let instance = this.system.getInstance();
                instance.loadConfig();
                this.system.addInstance(instance);

                this.service.setConfig(instance.config);
                return this.service.callHook('setup', ctx);
            }
        }], {setup: true}).then(() => {
            let promise = argv.start ? Promise.resolve({start: true}) : this.ui.prompt({
                type: 'confirm',
                name: 'start',
                message: 'Do you want to start Ghost?',
                default: true
            });

            return promise.then((answer) => {
                if (answer.start) {
                    return this.runCommand(StartCommand, argv);
                }
            });
        });
    }
}

SetupCommand.description = 'Setup an installation of Ghost (after it is installed)';
SetupCommand.options = {
    stack: {
        description: 'Check the system stack on setup',
        type: 'boolean',
        default: true
    },
    local: {
        alias: 'l',
        description: 'Quick setup for a local install of Ghost',
        type: 'boolean'
    },
    start: {
        name: 'start',
        description: 'Automatically start Ghost without prompting',
        type: 'boolean'
    }
};

module.exports = SetupCommand;
