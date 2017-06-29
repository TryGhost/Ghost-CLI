'use strict';
const url            = require('url');
const path           = require('path');
const get            = require('lodash/get');
const omit           = require('lodash/omit');

const errors         = require('../errors');
const Command        = require('../command');
const setupChecks    = require('./doctor/checks/setup');
const StartCommand   = require('./start');
const ConfigCommand  = require('./config');

class SetupCommand extends Command {
    static configureOptions(commandName, yargs, extensions) {
        extensions.forEach((extension) => {
            let options = get(extension, 'config.options.setup', false);
            if (!options) {
                return;
            }

            Object.assign(this.options, omit(options, Object.keys(this.options)));
        });

        yargs = super.configureOptions(commandName, yargs, extensions);
        return ConfigCommand.configureOptions('config', yargs, extensions);
    }

    constructor(ui, system) {
        super(ui, system);

        this.stages = [];
    }

    addStage(name, fn) {
        this.stages.push({
            name: name,
            fn: fn
        });
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

        let initialStages = [{
            title: 'Running setup checks',
            skip: () => !argv.stack,
            task: () => this.ui.listr(setupChecks, false)
        }, {
            title: 'Setting up instance',
            task: () => {
                let instance = this.system.getInstance();
                instance.loadConfig();
                instance.name = argv.pname || url.parse(instance.config.get('url')).hostname.replace(/\./g, '-');
                this.system.addInstance(instance);
            }
        }];

        if (argv.stage) {
            return this.system.hook('setup', this, argv).then(() => {
                let stage = this.stages.find(stage => stage.name === argv.stage);

                if (!stage) {
                    throw new errors.SystemError(`No setup stage '${argv.stage} exists`);
                }

                return this.ui.listr([{
                    title: `Setting up ${stage.name}`,
                    task: (ctx, task) => stage.fn(argv, Object.assign(ctx, {single: true}), task)
                }]);
            });
        }

        return this.ui.run(() => this.runCommand(ConfigCommand, argv), 'Configuring Ghost').then(
            () => this.system.hook('setup', this, argv)
        ).then(() => {
            let tasks = initialStages.concat(this.stages.map((stage) => {
                return {
                    title: `Setting up ${stage.name}`,
                    task: (ctx, task) => {
                        if (argv[`setup-${stage.name}`] === false) {
                            return task.skip();
                        }

                        if (!argv.prompt) {
                            // Prompt has been disabled and there has not been a `--no-setup-<stagename>`
                            // flag passed, so we will automatically run things
                            return stage.fn(argv, ctx, task);
                        }

                        return this.ui.confirm(`Do you wish to set up ${stage.name}?`, true).then((res) => {
                            if (!res.yes) {
                                return task.skip();
                            }

                            return stage.fn(argv, ctx, task);
                        });
                    }
                };
            }));

            return this.ui.listr(tasks, {setup: true}).then(() => {
                if (!argv.prompt || argv.start) {
                    return Promise.resolve({yes: argv.start});
                }

                return this.ui.confirm('Do you want to start Ghost?', true);
            }).then((res) => {
                return res.yes && this.runCommand(StartCommand, argv);
            });
        });
    }
}

SetupCommand.description = 'Setup an installation of Ghost (after it is installed)';
SetupCommand.params = '[stage]';
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
    },
    pname: {
        description: 'Ghost instance name',
        type: 'string'
    }
};

module.exports = SetupCommand;
