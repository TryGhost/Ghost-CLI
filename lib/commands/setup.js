'use strict';
const url            = require('url');
const Command        = require('../command');
const StartCommand   = require('./start');
const ConfigCommand  = require('./config');

class SetupCommand extends Command {
    static configureOptions(commandName, yargs, extensions, onlyOptions) {
        const get = require('lodash/get');
        const omit = require('lodash/omit');

        extensions.forEach((extension) => {
            const options = get(extension, 'config.options.setup', false);
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

    getDefaultStages() {
        const linux = require('../tasks/linux');

        return [{
            key: 'config',
            title: 'Configuring Ghost',
            task: (ctx) => this.runCommand(ConfigCommand, Object.assign({ignoreEnvCheck: true}, ctx.argv)),
            enabled: (ctx) => !ctx.argv.stages.length
        }, {
            key: 'instance',
            title: 'Setting up instance',
            task: (ctx) => {
                ctx.instance = this.system.getInstance();
                ctx.instance.name = (ctx.argv.pname || url.parse(ctx.instance.config.get('url')).hostname).replace(/\./g, '-');
                this.system.addInstance(ctx.instance);
            }
        }, {
            key: 'linux-user',
            title: 'Setting up "ghost" system user',
            task: linux.bind(this),
            enabled: (ctx) => ctx.argv &&
                ctx.argv['setup-linux-user'] !== false &&
                this.system.platform.linux &&
                ctx.argv.process !== 'local'
        }];
    }

    run(argv) {
        const path = require('path');
        const includes = require('lodash/includes');
        const flatten = require('lodash/flatten');

        const migrate = require('../tasks/migrate');

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

            if (argv.start !== false) {
                argv.start = true;
            }

            // In the case that the user runs `ghost setup --local`, we want to make
            // sure we're set up in development mode
            this.system.setEnvironment(true, true);
        }

        argv.stages = argv.stages || [];

        if (argv.stages.length) {
            const instance = this.system.getInstance();

            // If a user is running a specific setup stage (or stages), we want to run the env check here.
            // That way, if they haven't run setup at all for the particular environment that they're running
            // this stage for, then it will use the other one
            instance.checkEnvironment();
        }

        return this.system.hook('setup').then((extensionStages) => {
            const migrateStage = {
                key: 'migrate',
                title: 'Running database migrations',
                task: migrate
            };

            // Get default stages, add extension stages,
            // add migrate stage, then filter by any stages supplied via args
            const stages = this.getDefaultStages()
                .concat(flatten(extensionStages.filter(Boolean)))
                .concat(migrateStage)
                .filter((stage) => !argv.stages.length || includes(argv.stages, stage.key));

            if (!stages.length) {
                const additional = argv.stages.length ? ' with the given filters' : '';
                this.ui.log(`No setup stages were found to run${additional}.`);

                return Promise.resolve();
            }

            const taskMap = {};
            const tasks = stages.map((stage) => {
                const key = stage.key;
                const dependencies = stage.dependencies || [];
                const description = stage.description || key;

                const taskWrapper = (ctx, task) => {
                    taskMap[key] = task;

                    const skipped = dependencies.filter((dep) => !taskMap[dep] || taskMap[dep]._task.isSkipped());

                    if (skipped.length) {
                        const plural = skipped.length > 1;
                        this.ui.log(`Task ${key} depends on the '${skipped.join('\', \'')}' ${plural ? 'stages' : 'stage'}, which ${plural ? 'were' : 'was'} skipped.`, 'gray');
                        return task.skip();
                    }

                    const failed = dependencies.filter((dep) => !taskMap[dep] || taskMap[dep]._task.hasFailed());

                    if (failed.length) {
                        const plural = failed.length > 1;
                        this.ui.log(`Task ${key} depends on the '${failed.join('\', \'')}' ${plural ? 'stages' : 'stage'}, which failed.`, 'gray');
                        return task.skip();
                    }

                    if (ctx.argv[`setup-${key}`] === false) {
                        return task.skip();
                    }

                    return this.ui.confirm(`Do you wish to set up ${description}?`, true).then((confirmed) => {
                        if (!confirmed) {
                            return task.skip();
                        }

                        return stage.task(ctx, argv);
                    });
                }

                return {
                    title: `Setting up ${description}`,
                    task: taskWrapper,
                    enabled: stage.enabled,
                    skip: stage.skip
                };
            });

            return this.ui.listr(tasks, {argv: argv, setup: true})
        }).then(() => {
            if (argv.start) {
                return Promise.resolve(true);
            }

            const defaultValue = (argv.start !== false);

            return this.ui.confirm('Do you want to start Ghost?', defaultValue);
        }).then((confirmed) => {
            return confirmed && this.runCommand(StartCommand, argv);
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
SetupCommand.checkVersion = true;

module.exports = SetupCommand;
