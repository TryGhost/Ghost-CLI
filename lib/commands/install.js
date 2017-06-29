'use strict';
const fs = require('fs-extra');
const path = require('path');
const every = require('lodash/every');
const Promise = require('bluebird');
const Command = require('../command');
const symlinkSync = require('symlink-or-copy').sync;

// Utils
const resolveVersion = require('../utils/resolve-version');
const errors = require('../errors');

// Tasks/Commands
const installChecks = require('./doctor/checks/install');
const ensureStructure = require('../tasks/ensure-structure');
const yarnInstall = require('../tasks/yarn-install');
const SetupCommand = require('./setup');

class InstallCommand extends Command {
    static configureOptions(commandName, yargs, extensions) {
        yargs = super.configureOptions(commandName, yargs, extensions);
        return SetupCommand.configureOptions('setup', yargs, extensions);
    }

    run(argv) {
        // Dir was specified, so we make sure it exists and chdir into it.
        if (argv.dir) {
            let dir = path.resolve(argv.dir);

            fs.ensureDirSync(dir);
            process.chdir(dir);
        }

        let version = argv.version;
        let filesInDir = fs.readdirSync(process.cwd());

        // Check if there are existing files that *aren't* ghost-cli debug log files
        if (filesInDir.length && !every(filesInDir, (file) => file.match(/^ghost-cli-debug-.*\.log$/i))) {
            return Promise.reject(new errors.SystemError('Current directory is not empty, Ghost cannot be installed here.'));
        }

        let local = false;

        if (version === 'local') {
            local = true;
            version = null;
            this.system.setEnvironment(true, true);
        }

        return this.ui.listr([{
            title: 'Checking for latest Ghost version',
            task: this.version
        }, {
            title: 'Running system checks',
            task: () => this.ui.listr(installChecks, false, {concurrent: true})
        }, {
            title: 'Setting up install directory',
            task: ensureStructure
        }, {
            title: 'Downloading and installing Ghost',
            task: (ctx, task) => {
                task.title = `Downloading and installing Ghost v${ctx.version}`;
                return yarnInstall(ctx.ui);
            }
        }, {
            title: 'Moving files',
            task: () => this.ui.listr([{
                title: 'Summoning Casper',
                task: this.casper
            }, {
                title: 'Linking things',
                task: this.link.bind(this)
            }], false, {concurrent: true})
        }], {
            version: version,
            cliVersion: this.cliVersion
        }).then(() => {
            if (!argv.setup) {
                return;
            }

            argv.local = local;

            return this.runCommand(SetupCommand, argv);
        });
    }

    version(ctx) {
        return resolveVersion(ctx.version).then((version) => {
            ctx.version = version;
            ctx.installPath = path.join(process.cwd(), 'versions', version);
        });
    }

    casper(ctx) {
        return fs.move(
            path.join(ctx.installPath, 'content', 'themes', 'casper'),
            path.join(process.cwd(), 'content', 'themes', 'casper')
        );
    }

    link(ctx) {
        symlinkSync(ctx.installPath, path.join(process.cwd(), 'current'));

        // Make sure we save the current cli version to the config
        // also - this ensures the config exists so the config command
        // doesn't throw errors
        this.system.getInstance().cliConfig
            .set('cli-version', this.system.cliVersion)
            .set('active-version', ctx.version).save();
    }
}

InstallCommand.global = true;
InstallCommand.description = 'Install a brand new instance of Ghost';
InstallCommand.params = '[version]';
InstallCommand.options = {
    dir: {
        alias: 'd',
        description: 'Folder to install Ghost in',
        type: 'string'
    },
    setup: {
        description: 'Automatically run the setup command',
        type: 'boolean',
        default: true
    }
};

module.exports = InstallCommand;
