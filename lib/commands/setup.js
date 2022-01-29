'use strict';
const path = require('path');
const Command = require('../command');
const StartCommand = require('./start');
const options = require('../tasks/configure/options');

class SetupCommand extends Command {
    static configureOptions(commandName, yargs, extensions, onlyOptions) {
        const get = require('lodash/get');
        const omit = require('lodash/omit');

        extensions.forEach((extension) => {
            const options = get(extension, 'config.options.setup', false);
            if (!options) {
                return;
            }

            this.options = {...omit(options, Object.keys(this.options)), ...this.options};
        });

        yargs = super.configureOptions(commandName, yargs, extensions, onlyOptions);
        yargs = StartCommand.configureOptions('start', yargs, extensions, true);

        return yargs;
    }

    localArgs(argv) {
        const dbpath = argv.db ? null : path.join(process.cwd(), 'content/data/ghost-local.db');
        const args = {
            url: 'http://localhost:2368',
            pname: 'ghost-local',
            process: 'local',
            stack: false,
            db: 'sqlite3',
            start: true,
            ...argv
        };

        if (dbpath) {
            args.dbpath = dbpath;
        }

        return args;
    }

    tasks(steps) {
        const url = require('url');
        const semver = require('semver');
        const flatten = require('lodash/flatten');

        const linux = require('../tasks/linux');
        const migrator = require('../tasks/migrator');
        const configure = require('../tasks/configure');
        const {importTask} = require('../tasks/import');

        // This is used so we can denote built-in setup steps
        // and disable the "do you wish to set up x?" prompt
        // We use symbols so extension-defined tasks can't
        // mark themselves as internal and skip the prompt
        const internal = Symbol('internal setup step');
        const extSteps = flatten(steps.filter(Boolean)).filter(step => step.id && step.task);

        return [{
            id: 'config',
            title: 'Configuring Ghost',
            [internal]: true,
            task: ({instance, argv, single}) => configure(this.ui, instance.config, argv, this.system.environment, !single)
        }, {
            id: 'instance',
            [internal]: true,
            task: ({instance, argv}) => {
                instance.name = (argv.pname || url.parse(instance.config.get('url')).hostname).replace(/\./g, '-');
                this.system.addInstance(instance);

                // Ensure we set the content path when we set up the instance
                if (!instance.config.has('paths.contentPath')) {
                    instance.config.set('paths.contentPath', path.join(instance.dir, 'content')).save();
                }
            },
            enabled: ({instance}) => !instance.isSetup
        }, {
            id: 'linux-user',
            name: '"ghost" system user',
            [internal]: true,
            task: linux,
            enabled: ({argv}) => !argv.local && this.system.platform.linux && argv.process !== 'local'
        }, ...extSteps, {
            id: 'migrate',
            title: 'Running database migrations',
            [internal]: true,
            task: migrator.migrate,
            // Check argv.migrate for backwards compatibility
            // CASE: Ghost > 2.0 runs migrations itself
            enabled: ({instance, argv}) => argv.migrate !== false && semver.major(instance.version) < 2
        }, {
            id: 'start',
            title: 'Starting Ghost',
            [internal]: true,
            enabled: ({argv}) => !argv.single && argv.start !== false,
            skip: async ({instance, argv, ui}) => {
                const isRunning = await instance.isRunning();
                if (isRunning) {
                    return true;
                }

                if (argv.start || argv.fromExport) {
                    return false;
                }

                const confirmed = await ui.confirm('Do you want to start Ghost?', true);
                return !confirmed;
            },
            task: ({instance, argv}) => instance.start(argv.enable)
        }, {
            id: 'import',
            title: 'Importing content',
            [internal]: true,
            enabled: ({argv}) => Boolean(argv.fromExport),
            task: ({ui, instance, argv}) => importTask(ui, instance, argv.fromExport)
        }].map((step) => {
            const name = step.name || step.id;
            const title = step.title || `Setting up ${name}`;
            const origEnabled = step.enabled || (() => true);
            const enabled = (ctx, ...args) => {
                const {argv} = ctx;

                if (argv.stages.length) {
                    return argv.stages.includes(step.id) && !step[internal] && origEnabled(ctx, ...args);
                }

                if (argv[`setup-${step.id}`] === false) {
                    return false;
                }

                return origEnabled(ctx, ...args);
            };
            const task = async (ctx, task) => {
                if (ctx.single || step[internal]) {
                    return step.task(ctx, task);
                }

                const confirmed = await this.ui.confirm(`Do you wish to set up ${name}?`, true);
                if (!confirmed) {
                    if (step.onUserSkip) {
                        await step.onUserSkip(ctx);
                    }

                    return task.skip();
                }

                return step.task(ctx, task);
            };

            return {...step, title, enabled, task};
        });
    }

    async run(argv = {}) {
        // Ensure stages is an array
        argv.stages = argv.stages || [];

        const {local = false, stages} = argv;

        if (local) {
            argv = this.localArgs(argv);

            // In the case that the user runs `ghost setup --local`, we want to make
            // sure we're set up in development mode
            this.system.setEnvironment(true, true);
        }

        const instance = this.system.getInstance();

        if (stages.length) {
            // If a user is running a specific setup stage (or stages), we want to run the env check here.
            // That way, if they haven't run setup at all for the particular environment that they're running
            // this stage for, then it will use the other one
            instance.checkEnvironment();
        }

        const steps = await this.system.hook('setup');
        const tasks = this.tasks(steps);
        const listr = this.ui.listr(tasks, false, {exitOnError: false});
        const taskMap = listr.tasks.reduce(
            (map, task, index) => ({[tasks[index].id]: task, ...map}),
            {}
        );

        await listr.run({
            ui: this.ui,
            system: this.system,
            instance,
            tasks: taskMap,
            listr,
            argv,
            single: Boolean(stages.length)
        });

        if (stages.length) {
            return;
        }

        if (instance.config.get('mail.transport') === 'Direct') {
            this.ui.log('\nGhost uses direct mail by default. To set up an alternative email method read our docs at https://ghost.org/docs/config/#mail', 'gray');
        }

        let adminUrl = instance.config.get('admin.url', instance.config.get('url', ''));
        adminUrl = `${adminUrl.replace(/\/$/, '')}/ghost/`;

        this.ui.log('\n------------------------------------------------------------------------------', 'white');
        this.ui.log('Ghost was installed successfully! To complete setup of your publication, visit', adminUrl, 'green', 'link', true);
    }
}

SetupCommand.description = 'Setup an installation of Ghost (after it is installed)';
SetupCommand.longDescription = '$0 setup [stages..]\n stages can be one or more of nginx, ssl, mysql, systemd, migrate, linux-user.';
SetupCommand.params = '[stages..]';
SetupCommand.options = {
    ...options,
    start: {
        description: '[--no-start] Enable/disable automatically starting Ghost'
    },
    local: {
        alias: 'l',
        description: 'Quick setup for a local install of Ghost',
        type: 'boolean',
        hidden: true
    },
    pname: {
        description: 'Ghost instance name',
        type: 'string',
        group: 'Service Options:'
    },
    enable: {
        description: '[--no-enable] Enable/don\'t enable instance restart on server reboot (if the process manager supports it)',
        type: 'boolean',
        default: true
    }
};
SetupCommand.runPreChecks = true;

module.exports = SetupCommand;
