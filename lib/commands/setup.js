'use strict';
const os             = require('os');
const url            = require('url');
const path           = require('path');
const get            = require('lodash/get');
const omit           = require('lodash/omit');
const includes       = require('lodash/includes');

const Command        = require('../command');
const migrate        = require('../tasks/migrate');
const linux          = require('../tasks/linux');
const StartCommand   = require('./start');
const ConfigCommand  = require('./config');

class SetupCommand extends Command {
    static configureOptions(commandName, yargs, extensions, onlyOptions) {
        extensions.forEach((extension) => {
            let options = get(extension, 'config.options.setup', false);
            if (!options) {
                return;
            }

            Object.assign(this.options, omit(options, Object.keys(this.options)));
        });

        yargs = super.configureOptions(commandName, yargs, extensions, onlyOptions);
        yargs = ConfigCommand.configureOptions('config', yargs, extensions, true);
        yargs = StartCommand.configureOptions('start', yargs, extensions, true);
    }

    constructor(ui, system) {
        super(ui, system);

        this.stages = [];
    }

    addStage(name, fn, dependencies, description) {
        this.stages.push({
            name: name,
            description: description || name,
            dependencies: dependencies && (Array.isArray(dependencies) ? dependencies : [dependencies]),
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

        if (argv.stages && argv.stages.length) {
            let instance = this.system.getInstance();

            // If a user is running a specific setup stage (or stages), we want to run the env check here.
            // That way, if they haven't run setup at all for the particular environment that they're running
            // this stage for, then it will use the other one
            instance.checkEnvironment();

            return this.system.hook('setup', this, argv).then(() => {
                let tasks = this.stages.filter((stage) => includes(argv.stages, stage.name)).map((stage) => {
                    return {
                        title: `Setting up ${stage.description}`,
                        task: (ctx, task) => stage.fn(argv, ctx, task)
                    };
                });

                // Special-case migrations
                if (includes(argv.stages, 'migrate')) {
                    tasks.push({title: 'Running database migrations', task: migrate})
                }

                if (includes(argv.stages, 'linux-user')) {
                    if (os.platform() !== 'linux') {
                        this.ui.log('Operating system is not Linux, skipping Linux setup', 'yellow');
                    } else {
                        // we want this to run first so we use unshift rather than push
                        tasks.unshift({
                            title: 'Setting up "ghost" system user',
                            task: linux.bind(this)
                        });
                    }
                }

                return this.ui.listr(tasks, {single: true, instance: instance});
            });
        }

        let initialStages = [{
            title: 'Setting up instance',
            task: (ctx) => {
                ctx.instance = this.system.getInstance();
                ctx.instance.name = argv.pname || url.parse(ctx.instance.config.get('url')).hostname.replace(/\./g, '-');
                this.system.addInstance(ctx.instance);
            }
        }];

        if (!argv.local && os.platform() === 'linux') {
            initialStages.push({
                title: 'Setting up "ghost" system user',
                task: linux.bind(this)
            });
        }

        return this.ui.run(() => this.runCommand(ConfigCommand, argv), 'Configuring Ghost').then(
            () => this.system.hook('setup', this, argv)
        ).then(() => {
            let taskMap = {};

            let tasks = initialStages.concat(this.stages.map((stage) => {
                return {
                    title: `Setting up ${stage.description}`,
                    task: (ctx, task) => {
                        taskMap[stage.name] = task;

                        if (stage.dependencies) {
                            // TODO: this depends on Listr private API, probably should find a better way
                            let skipped = stage.dependencies.filter(dep => !taskMap[dep] || taskMap[dep]._task.isSkipped());

                            if (skipped && skipped.length) {
                                let plural = skipped.length > 1;
                                this.ui.log(`Task ${stage.name} depends on the '${skipped.join('\', \'')}' ${plural ? 'stages' : 'stage'}, which ${plural ? 'were' : 'was'} skipped.`, 'gray');
                                return task.skip();
                            }
                        }

                        if (argv[`setup-${stage.name}`] === false) {
                            return task.skip();
                        }

                        if (!argv.prompt) {
                            // Prompt has been disabled and there has not been a `--no-setup-<stagename>`
                            // flag passed, so we will automatically run things
                            return stage.fn(argv, ctx, task);
                        }

                        return this.ui.confirm(`Do you wish to set up ${stage.description}?`, true).then((res) => {
                            if (!res.yes) {
                                return task.skip();
                            }

                            return stage.fn(argv, ctx, task);
                        });
                    }
                };
            }));

            if (argv.migrate !== false) {
                // Tack on db migration task to the end
                tasks.push({
                    title: 'Running database migrations',
                    task: migrate
                });
            }

            return this.ui.listr(tasks, {setup: true}).then(() => {
                // If we are not allowed to prompt, set the default value, which should be true
                if (!argv.prompt) {
                    argv.start = true;
                }

                // If argv.start has a value, this means either --start or --no-start were explicitly provided
                // (or --no-prompt was provided, and we already defaulted to true)
                // In this case, we don't prompt, we use the value of argv.start
                if (argv.start || argv.start === false) {
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
SetupCommand.longDescription = '$0 setup [stages..]\n stages can be one or more of nginx, ssl, mysql, systemd, migrate, linux-user.';
SetupCommand.params = '[stages..]';
SetupCommand.options = {
    start: {
        description: '[--no-start] Enable/disable automatically starting Ghost'
    },
    local: {
        alias: 'l',
        description: 'Quick setup for a local install of Ghost',
        type: 'boolean'
    },
    pname: {
        description: 'Ghost instance name',
        type: 'string'
    }
};

module.exports = SetupCommand;
