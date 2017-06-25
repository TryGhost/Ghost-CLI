'use strict';
const eol   = require('os').EOL;
const path  = require('path');
const chalk = require('chalk');
const Listr = require('listr');

const Config                = require('../utils/config');
const errors                = require('../errors');
const setupChecks           = require('./doctor/checks/setup');
const StartCommand          = require('./start');
const ConfigCommand         = require('./config');
const Command               = require('../command');
const dedupeProcessName     = require('../utils/dedupe-process-name');

class SetupCommand extends Command {
    static configureOptions(commandName, yargs) {
        yargs = super.configureOptions(commandName, yargs);
        return ConfigCommand.configureOptions('config', yargs);
    }

    run(argv) {
        let context = {
            renderer: this.renderer,
            verbose: this.verbose
        };

        if (argv.local) {
            argv.url = argv.url || 'http://localhost:2368/';
            argv.pname = argv.pname || 'ghost-local';
            argv.process = 'local';

            // If the user's already specified a db client, then we won't override it.
            if (!argv.db) {
                argv.db = argv.db || 'sqlite3';
                argv.dbpath = path.join(process.cwd(), 'content/data/ghost-local.db');
            }

            context.start = true;

            // In the case that the user runs `ghost setup --local`, we want to make
            // sure we're set up in development mode
            this.development = true;
            process.env.NODE_ENV = this.environment = 'development';
        } else {
            context.start = argv.start || false;
        }

        let configCommand = new ConfigCommand(this);
        return configCommand.run(argv).then((config) => {
            context.config = config;

            if (!argv.local && argv.stack) {
                return new Listr(setupChecks, {concurrent: true, renderer: this.renderer}).run(context)
                    .then((context) => {context.continue = true;})
                    .catch((error) => {
                        if (!(error instanceof errors.SystemError)) {
                            return Promise.reject(error);
                        }

                        this.ui.log(
                            `System Stack checks failed with message: '${error.message}'.${eol}` +
                            'Some features of Ghost-CLI may not work without additional configuration.',
                            'yellow'
                        );

                        return this.ui.prompt({
                            type: 'confirm',
                            name: 'continue',
                            message: chalk.blue('Continue anyways?'),
                            default: true
                        }).then((answers) => {
                            if (!answers.continue) {
                                return Promise.reject(new Error(
                                    `Setup was halted. Ghost is installed but not fully setup.${eol}` +
                                    'Fix any errors shown and re-run `ghost setup`, or run `ghost setup --no-stack`.'
                                ));
                            }
                        });
                    });
            }
        }).then(() => {
            // De-duplicate process name before setting up the process manager
            dedupeProcessName(context.config);

            this.service.setConfig(context.config);

            return this.ui.run(this.service.callHook('setup', context), 'Finishing setup');
        }).then(() => {
            if (context.start) {
                return;
            }

            return this.ui.prompt({
                type: 'confirm',
                name: 'start',
                message: 'Do you want to start Ghost?',
                default: true
            });
        }).then((answer) => {
            // Add config to system blog list
            let systemConfig = Config.load('system');
            let instances = systemConfig.get('instances', {});
            instances[context.config.get('pname')] = {
                cwd: process.cwd()
            };
            systemConfig.set('instances', instances).save();

            if (context.start || answer.start) {
                let startCommand = new StartCommand(this);
                return startCommand.run(argv);
            }
        });
    }
}

SetupCommand.description = 'Setup an installation of Ghost (after it is installed)';
SetupCommand.options = {
    noStack: {
        description: 'Don\'t check the system stack on setup',
        type: 'boolean'
    },
    local: {
        alias: 'l',
        description: 'Quick setup for a local install of Ghost',
        type: 'boolean'
    },
    start: {
        name: 'start',
        description: 'Automatically start Ghost without prompting',
        flag: true
    }
};

module.exports = SetupCommand;
