'use strict';
const fs = require('fs-extra');
const path = require('path');
const Listr = require('listr');
const symlinkSync = require('symlink-or-copy').sync;

// Utils
const errors = require('../errors');
const Command = require('../command');
const Config = require('../utils/config');
const resolveVersion = require('../utils/resolve-version');

// Tasks/Commands
// TODO: update checks
const yarnInstall = require('../tasks/yarn-install');
const StopCommand = require('./stop');
const StartCommand = require('./start');

class UpdateCommand extends Command {
    run(argv) {
        let config = Config.load('.ghost-cli');
        let context = {
            config: config,
            force: argv.force,
            activeVersion: config.get('active-version'),
            version: argv.version
        };

        if (argv.rollback) {
            if (!config.get('previous-version')) {
                throw new Error('No previous version found');
            }

            context.rollback = true;
            context.version = config.get('previous-version');
            context.installPath = path.join(process.cwd(), 'versions', context.version);
        }

        // If Ghost isn't currently running, we want to make sure that we use the right config file
        // instead of relying on the environment set when ghost is started
        if (!this.development && fs.existsSync(path.join(process.cwd(), 'config.development.json')) &&
                !fs.existsSync(path.join(process.cwd(), 'config.production.json'))) {
            this.development = false;
            process.env.NODE_ENV = this.environment = 'development';
        }

        context.environment = config.get('running', this.environment);

        this.service.setConfig(Config.load(context.environment));

        return new Listr([{
            title: 'Checking for latest Ghost version',
            skip: (ctx) => ctx.rollback,
            task: this.constructor.tasks.version
            // TODO: add meaningful update checks after this task
        }, {
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
                return yarnInstall(ctx.renderer);
            }
        }, {
            title: 'Stopping Ghost',
            skip: (ctx) => !ctx.environment,
            task: () => {
                let stopCommand = new StopCommand(this);

                return stopCommand.run({quiet: true}).catch((error) => {
                    if (error instanceof errors.SystemError && error.message.match(/No running Ghost instance/)) {
                        return;
                    }

                    return Promise.reject(error);
                })
            }
        }, {
            title: 'Linking things',
            task: this.constructor.tasks.link
        }, {
            title: 'Installing new version of Casper',
            task: (ctx) => {
                let casperPath = path.join(process.cwd(), 'content', 'themes', 'casper');

                return fs.remove(casperPath).then(() => fs.move(
                    path.join(ctx.installPath, 'content', 'themes', 'casper'),
                    casperPath
                ));
            }
        }, {
            title: 'Restarting Ghost',
            task: () => {
                let startCommand = new StartCommand(this);
                return startCommand.run({quiet: true});
            }
        }], {renderer: this.renderer}).run(context);
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

UpdateCommand.tasks = {
    version: (ctx) => resolveVersion(ctx.version, ctx.force ? null : ctx.activeVersion).then((version) => {
        ctx.version = version;
        ctx.installPath = path.join(process.cwd(), 'versions', version);
    }),
    link: (ctx) => {
        fs.removeSync(path.join(process.cwd(), 'current'));
        symlinkSync(ctx.installPath, path.join(process.cwd(), 'current'));

        ctx.config.set('previous-version', ctx.rollback ? null : ctx.config.get('active-version'))
            .set('active-version', ctx.version).save();
    }
};

module.exports = UpdateCommand;
