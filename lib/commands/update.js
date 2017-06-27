'use strict';
const fs = require('fs-extra');
const path = require('path');
const symlinkSync = require('symlink-or-copy').sync;

// Utils
const errors = require('../errors');
const Command = require('../command');
const resolveVersion = require('../utils/resolve-version');

// Tasks/Commands
// TODO: update checks
const yarnInstall = require('../tasks/yarn-install');
const StopCommand = require('./stop');
const StartCommand = require('./start');

class UpdateCommand extends Command {
    run(argv) {
        let instance = this.system.getInstance();

        let context = {
            instance: instance,
            force: argv.force,
            activeVersion: instance.cliConfig.get('active-version'),
            version: argv.version
        };

        if (argv.rollback) {
            if (!instance.cliConfig.get('previous-version')) {
                throw new Error('No previous version found');
            }

            context.rollback = true;
            context.version = instance.cliConfig.get('previous-version');
            context.installPath = path.join(process.cwd(), 'versions', context.version);
        }

        instance.running ? instance.loadRunningConfig(true, true) : instance.loadConfig();
        this.service.setConfig(instance.config);

        // TODO: add meaningful update checks after this task
        let tasks = [{
            title: 'Downloading and updating Ghost',
            skip: (ctx) => ctx.rollback,
            task: (ctx, task) => {
                if (fs.existsSync(ctx.installPath)) {
                    if (!ctx.force) {
                        task.skip('Version already installed.');
                        return;
                    }

                    fs.removeSync(ctx.installPath);
                }

                task.title = `Downloading and updating Ghost to v${ctx.version}`;
                return yarnInstall(ctx.ui);
            }
        }, {
            title: 'Stopping Ghost',
            skip: (ctx) => !ctx.instance.running,
            task: () => {
                return this.runCommand(StopCommand, {quiet: true}).catch((error) => {
                    if (!(error instanceof errors.SystemError) || !error.message.match(/Nu running Ghost instance/)) {
                        return Promise.reject(error);
                    }
                });
            }
        }, {
            title: 'Linking things',
            task: this.link
        }, {
            title: 'Installing new version of Casper',
            skip: (ctx) => ctx.rollback,
            task: (ctx, task) => {
                let casperPath = path.join(process.cwd(), 'content', 'themes', 'casper');

                if (!fs.existsSync(casperPath)) {
                    return task.skip();
                }

                return fs.remove(casperPath).then(() => fs.move(
                    path.join(ctx.installPath, 'content', 'themes', 'casper'),
                    casperPath
                ));
            }
        }, {
            title: 'Restarting Ghost',
            task: () => {
                return this.runCommand(StartCommand, {quiet: true});
            }
        }];

        return this.ui.run(() => this.version(context), 'Checking for latest Ghost version').then((result) => {
            if (!result) {
                this.ui.log('All up to date!', 'cyan');
                return;
            }

            return this.ui.listr(tasks, context);
        });
    }

    version(context) {
        if (context.rollback) {
            return Promise.resolve(true);
        }

        return resolveVersion(context.version, context.force ? null : context.activeVersion).then((version) => {
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
        fs.removeSync(path.join(process.cwd(), 'current'));
        symlinkSync(context.installPath, path.join(process.cwd(), 'current'));

        context.instance.cliConfig.set('previous-version', context.rollback ? null : context.instance.cliConfig.get('active-version'))
            .set('active-version', context.version).save();
    }
}

UpdateCommand.description = 'Update a Ghost instance';
UpdateCommand.params = '[version]';
UpdateCommand.options = {
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
