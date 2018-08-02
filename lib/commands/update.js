'use strict';
const fs = require('fs-extra');
const path = require('path');

// Utils
const errors = require('../errors');
const Command = require('../command');
const DoctorCommand = require('./doctor');

class UpdateCommand extends Command {
    static configureOptions(commandName, yargs, extensions) {
        yargs = super.configureOptions(commandName, yargs, extensions);
        return DoctorCommand.configureOptions('doctor', yargs, extensions, true);
    }

    run(argv) {
        const chalk = require('chalk');
        const semver = require('semver');

        const MigrateCommand = require('./migrate');
        const migrator = require('../tasks/migrator');

        const instance = this.system.getInstance();

        // If installed with a version < 1.0
        if (semver.lt(instance.cliConfig.get('cli-version'), '1.0.0')) {
            this.ui.log(
                `Ghost was installed with Ghost-CLI v${instance.cliConfig.get('cli-version')}, which is a pre-release version.\n` +
                'Your Ghost install is using out-of-date configuration & requires manual changes.\n' +
                `Please visit ${chalk.blue.underline('https://docs.ghost.org/v1/docs/how-to-upgrade-ghost#section-upgrading-ghost-cli')}\n` +
                'for instructions on how to upgrade your instance.\n',
                'yellow'
            );
        }

        const {force, version, zip, v1} = argv;

        const context = {
            instance,
            force,
            activeVersion: instance.cliConfig.get('active-version'),
            version,
            zip,
            v1
        };

        if (argv.rollback) {
            if (!instance.cliConfig.get('previous-version')) {
                return Promise.reject(new Error('No previous version found'));
            }

            context.rollback = true;
            context.version = instance.cliConfig.get('previous-version');
            context.installPath = path.join(process.cwd(), 'versions', context.version);
        }

        return instance.running().then((isRunning) => {
            if (isRunning) {
                instance.loadRunningEnvironment(true);
            }

            instance.checkEnvironment();

            // TODO: add meaningful update checks after this task
            const tasks = [{
                title: 'Downloading and updating Ghost',
                skip: (ctx) => ctx.rollback,
                task: this.downloadAndUpdate
            }, {
                title: 'Stopping Ghost',
                enabled: () => isRunning,
                task: this.stop.bind(this)
            }, {
                title: 'Rolling back database migrations',
                enabled: (ctx) => ctx.rollback,
                task: migrator.rollback
            }, {
                title: 'Linking latest Ghost and recording versions',
                task: this.link
            }, {
                title: 'Running database migrations',
                skip: (ctx) => ctx.rollback,
                task: migrator.migrate,
                // CASE: We have moved the execution of knex-migrator into Ghost 2.0.0.
                //       If you are already on ^2 or you update from ^1 to ^2, then skip the task.
                enabled: () => {
                    if (semver.satisfies(instance.cliConfig.get('active-version'), '^2.0.0') ||
                        semver.satisfies(context.version, '^2.0.0')) {
                        return false;
                    }

                    return true;
                }
            }, {
                title: 'Restarting Ghost',
                skip: () => !argv.restart,
                task: this.restart.bind(this)
            }, {
                title: 'Removing old Ghost versions',
                skip: (ctx) => ctx.rollback,
                task: this.removeOldVersions
            }];

            return this.runCommand(DoctorCommand, Object.assign(
                {quiet: true, categories: ['update']},
                argv
            )).then(() => {
                return this.runCommand(MigrateCommand, {quiet: true})
            }).then(() => {
                return this.ui.run(() => this.version(context), 'Checking for latest Ghost version');
            }).then((result) => {
                if (!result) {
                    this.ui.log('All up to date!', 'cyan');
                    return;
                }

                return this.ui.listr(tasks, context)
                    .catch((error) => {
                        if (error instanceof errors.GhostError && !context.rollback) {
                            return this.rollbackFromFail(error, context.version, argv['auto-rollback']);
                        }

                        throw error;
                    });
            });
        });
    }

    downloadAndUpdate(ctx, task) {
        const yarnInstall = require('../tasks/yarn-install');

        if (fs.existsSync(ctx.installPath)) {
            if (!ctx.force) {
                task.skip('Version already installed.');
                return Promise.resolve();
            }

            fs.removeSync(ctx.installPath);
        }

        task.title = `Downloading and updating Ghost to v${ctx.version}`;
        return yarnInstall(ctx.ui, ctx.zip);
    }

    stop() {
        const StopCommand = require('./stop');

        return this.runCommand(StopCommand, {quiet: true}).catch((error) => {
            if (!(error instanceof errors.SystemError) || !error.message.match(/No running Ghost instance/)) {
                return Promise.reject(error);
            }
        });
    }

    restart() {
        const StartCommand = require('./start');

        return this.runCommand(StartCommand, {quiet: true});
    }

    removeOldVersions(ctx, task) {
        const semver = require('semver');

        return fs.readdir(path.join(process.cwd(), 'versions')).then((versions) => {
            versions = versions.filter(semver.valid);
            if (versions.length <= 5) {
                task.skip();
                return;
            }

            versions.sort((a, b) => semver.lt(a, b) ? -1 : 1);

            const promises = versions.slice(0, -5).map((version) => {
                return fs.remove(path.join(process.cwd(), 'versions', version));
            });

            return Promise.all(promises);
        });
    }

    version(context) {
        const {rollback, zip, v1, version, force, activeVersion} = context;

        if (rollback) {
            return Promise.resolve(true);
        }

        const resolveVersion = zip ?
            () => require('../utils/version-from-zip')(zip, activeVersion, force) :
            () => require('../utils/resolve-version')(version, activeVersion, v1, force);

        return resolveVersion().then((version) => {
            context.version = version;
            context.installPath = path.join(process.cwd(), 'versions', version);
            return true;
        }).catch((error) => {
            if (!(error instanceof errors.CliError) || !error.message.match(/No valid versions/)) {
                return Promise.reject(error);
            }

            return false;
        });
    }

    rollbackFromFail(error, newVer, force = false) {
        const oldVer = this.system.getInstance().cliConfig.get('previous-version');
        const question = `Unable to upgrade Ghost from v${oldVer} to v${newVer}. Would you like to revert back to v${oldVer}?`;

        this.ui.error(error, this.system);
        this.ui.log('\n\n');

        if (force) {
            return this.run({
                restart: true,
                rollback: true
            });
        }

        return this.ui.confirm(question, true).then(answer => {
            if (!answer) {
                return Promise.resolve();
            }

            return this.run({
                restart: true,
                rollback: true
            });
        });
    }

    link(context) {
        const symlinkSync = require('symlink-or-copy').sync;

        fs.removeSync(path.join(process.cwd(), 'current'));
        symlinkSync(context.installPath, path.join(process.cwd(), 'current'));

        context.instance.cliConfig.set('previous-version', context.rollback ? null : context.instance.cliConfig.get('active-version'))
            .set('active-version', context.version).save();
    }
}

UpdateCommand.description = 'Update a Ghost instance';
UpdateCommand.params = '[version]';
UpdateCommand.options = {
    zip: {
        description: 'Path to Ghost release zip to install',
        type: 'string'
    },
    rollback: {
        alias: 'r',
        description: 'Rollback to the previously installed Ghost version',
        type: 'boolean'
    },
    force: {
        alias: 'f',
        description: 'Force Ghost to update',
        type: 'boolean'
    },
    restart: {
        description: '[--no-restart] Enable/Disable restarting Ghost after updating',
        type: 'boolean',
        default: true
    },
    v1: {
        describe: 'Limit update to Ghost 1.x releases',
        type: 'boolean',
        default: false
    },
    'auto-rollback': {
        description: '[--no-auto-rollback] Enable/Disable automatically rolling back Ghost if updating fails',
        type: 'boolean',
        default: false
    }
};
UpdateCommand.checkVersion = true;

module.exports = UpdateCommand;
