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
        yargs = DoctorCommand.configureOptions('doctor', yargs, extensions, true);

        return yargs;
    }

    run(argv) {
        const chalk = require('chalk');
        const semver = require('semver');

        const MigrateCommand = require('./migrate');
        const migrator = require('../tasks/migrator');
        const majorUpdate = require('../tasks/major-update');

        const instance = this.system.getInstance();

        // If installed with a version < 1.0
        if (semver.lt(instance.cliVersion, '1.0.0')) {
            this.ui.log(
                `Ghost was installed with Ghost-CLI v${instance.cliVersion}, which is a pre-release version.\n` +
                'Your Ghost install is using out-of-date configuration & requires manual changes.\n' +
                `For instructions on how to upgrade your instance, visit ${chalk.blue.underline('https://docs.ghost.org/faq/upgrading-from-deprecated-ghost-cli/')}.\n`,
                'yellow'
            );
        }

        const {force, version, zip, v1} = argv;

        const context = {
            instance,
            force,
            activeVersion: instance.version,
            version,
            zip,
            v1
        };

        if (argv.rollback) {
            if (!instance.previousVersion) {
                return Promise.reject(new Error('No previous version found'));
            }

            context.rollback = true;
            context.version = instance.previousVersion;
            context.installPath = path.join(process.cwd(), 'versions', context.version);
        }

        return instance.running().then((isRunning) => {
            if (isRunning) {
                instance.loadRunningEnvironment(true);

                // argv.restart will only be undefined if it wasn't passed in
                if (!('restart' in argv)) {
                    argv.restart = true;
                }
            }

            instance.checkEnvironment();

            // TODO: add meaningful update checks after this task
            const tasks = [{
                title: 'Downloading and updating Ghost',
                skip: ({rollback}) => rollback,
                task: this.downloadAndUpdate
            }, {
                title: 'Updating to a major version',
                task: majorUpdate,
                // CASE: Skip if you are already on ^2 or you update from v1 to v1.
                enabled: () => {
                    if (semver.major(instance.version) === 2 ||
                        semver.major(context.version) === 1) {
                        return false;
                    }

                    return true;
                }
            }, {
                title: 'Stopping Ghost',
                enabled: () => isRunning,
                task: this.stop.bind(this)
            }, {
                title: 'Rolling back database migrations',
                enabled: ({rollback}) => rollback,
                task: migrator.rollback
            }, {
                title: 'Linking latest Ghost and recording versions',
                task: this.link
            }, {
                title: 'Running database migrations',
                skip: ({rollback}) => rollback,
                task: migrator.migrate,
                // CASE: We have moved the execution of knex-migrator into Ghost 2.0.0.
                //       If you are already on v2 or you update from v1 to v2, then skip the task.
                //       We compare the major versions, otherwise pre-releases won't match.
                enabled: () => {
                    if (semver.major(instance.version) === 2 ||
                        semver.major(context.version) === 2) {
                        return false;
                    }

                    return true;
                }
            }, {
                title: 'Restarting Ghost',
                enabled: () => argv.restart,
                task: this.restart.bind(this)
            }, {
                title: 'Removing old Ghost versions',
                skip: ({rollback}) => rollback,
                task: this.removeOldVersions
            }];

            return this.runCommand(DoctorCommand, Object.assign(
                {quiet: true, categories: ['update']},
                argv
            )).then(
                () => this.runCommand(MigrateCommand, {quiet: true})
            ).then(
                () => this.ui.run(() => this.version(context), 'Checking for latest Ghost version')
            ).then((result) => {
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

            // eslint-disable-next-line arrow-body-style
            versions.sort((a, b) => {
                return semver.lt(a, b) ? -1 : 1;
            });

            const promises = versions.slice(0, -5)
                .map(version => fs.remove(path.join(process.cwd(), 'versions', version)));

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
        const oldVer = this.system.getInstance().previousVersion;
        const question = `Unable to upgrade Ghost from v${oldVer} to v${newVer}. Would you like to revert back to v${oldVer}?`;

        this.ui.error(error, this.system);
        this.ui.log('\n\n');

        if (force) {
            return this.run({
                restart: true,
                rollback: true
            });
        }

        return this.ui.confirm(question, true).then((answer) => {
            if (!answer) {
                return Promise.resolve();
            }

            return this.run({
                restart: true,
                rollback: true
            });
        });
    }

    link({instance, installPath, version, rollback}) {
        const symlinkSync = require('symlink-or-copy').sync;

        fs.removeSync(path.join(process.cwd(), 'current'));
        symlinkSync(installPath, path.join(process.cwd(), 'current'));

        instance.previousVersion = rollback ? null : instance.version;
        instance.version = version;
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
        type: 'boolean'
    },
    version1: {
        alias: 'v1',
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
UpdateCommand.runPreChecks = true;

module.exports = UpdateCommand;
