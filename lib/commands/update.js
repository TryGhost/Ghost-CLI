'use strict';
const fs = require('fs-extra');
const path = require('path');

// Utils
const errors = require('../errors');
const Command = require('../command');

class UpdateCommand extends Command {
    run(argv) {
        const chalk = require('chalk');
        const semver = require('semver');

        const MigrateCommand = require('./migrate');
        const migrate = require('../tasks/migrate');

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

        const context = {
            instance: instance,
            force: argv.force,
            activeVersion: instance.cliConfig.get('active-version'),
            version: argv.version,
            zip: argv.zip
        };

        if (argv.rollback) {
            if (!instance.cliConfig.get('previous-version')) {
                return Promise.reject(new Error('No previous version found'));
            }

            context.rollback = true;
            context.version = instance.cliConfig.get('previous-version');
            context.installPath = path.join(process.cwd(), 'versions', context.version);
        }

        if (instance.running()) {
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
            skip: (ctx) => !ctx.instance.running(),
            task: this.stop.bind(this)
        }, {
            title: 'Linking latest Ghost and recording versions',
            task: this.link
        }, {
            title: 'Running database migrations',
            skip: (ctx) => ctx.rollback,
            task: migrate
        }, {
            title: 'Restarting Ghost',
            task: this.restart.bind(this)
        }, {
            title: 'Removing old Ghost versions',
            skip: (ctx) => ctx.rollback,
            task: this.removeOldVersions
        }];

        return this.runCommand(MigrateCommand, {quiet: true}).then(() => {
            return this.ui.run(() => this.version(context), 'Checking for latest Ghost version');
        }).then((result) => {
            if (!result) {
                this.ui.log('All up to date!', 'cyan');
                return;
            }

            return this.ui.listr(tasks, context);
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
        if (context.rollback) {
            return Promise.resolve(true);
        }

        const versionResolver = context.zip ?
            require('../utils/version-from-zip') :
            require('../utils/resolve-version');

        return versionResolver(
            context.zip || context.version,
            context.force ? null : context.activeVersion
        ).then((version) => {
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
    }
};

module.exports = UpdateCommand;
