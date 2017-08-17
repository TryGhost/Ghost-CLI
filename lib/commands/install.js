'use strict';
const path = require('path');
const Command = require('../command');
const symlinkSync = require('symlink-or-copy').sync;
const SetupCommand = require('./setup');

class InstallCommand extends Command {
    static configureOptions(commandName, yargs, extensions) {
        yargs = super.configureOptions(commandName, yargs, extensions);
        return SetupCommand.configureOptions('setup', yargs, extensions, true);
    }

    run(argv) {
        const fs = require('fs-extra');
        const every = require('lodash/every');
        const errors = require('../errors');
        const yarnInstall = require('../tasks/yarn-install');
        const installChecks = require('./doctor/checks/install');
        const ensureStructure = require('../tasks/ensure-structure');

        // Dir was specified, so we make sure it exists and chdir into it.
        if (argv.dir) {
            const dir = path.resolve(argv.dir);

            fs.ensureDirSync(dir);
            process.chdir(dir);
        }

        let version = argv.version;
        const filesInDir = fs.readdirSync(process.cwd());

        // Check if there are existing files that *aren't* ghost-cli debug log files
        if (filesInDir.length && !every(filesInDir, (file) => file.match(/^ghost-cli-debug-.*\.log$/i))) {
            return Promise.reject(new errors.SystemError('Current directory is not empty, Ghost cannot be installed here.'));
        }

        let local = false;

        // If command is `ghost install local`, or command is
        // `ghost install 1.x.x --local`, do a local install
        if (version === 'local' || argv.local) {
            local = true;
            version = (version === 'local') ? null : version;
            this.system.setEnvironment(true, true);
        }

        return this.ui.listr(installChecks, {
            ui: this.ui,
            argv: argv,
            local: local
        }).then(() => {
            return this.ui.listr([{
                title: 'Checking for latest Ghost version',
                task: this.version
            }, {
                title: 'Setting up install directory',
                task: ensureStructure
            }, {
                title: 'Downloading and installing Ghost',
                task: (ctx, task) => {
                    task.title = `Downloading and installing Ghost v${ctx.version}`;
                    return yarnInstall(ctx.ui, ctx.zip);
                }
            }, {
                title: 'Finishing install process',
                task: () => this.ui.listr([{
                    title: 'Linking latest Ghost and recording versions',
                    task: this.link.bind(this)
                }, {
                    title: 'Linking latest Casper',
                    task: this.casper
                }], false)
            }], {
                zip: argv.zip,
                version: version,
                cliVersion: this.system.cliVersion
            })
        }).then(() => {
            if (!argv.setup) {
                return Promise.resolve();
            }

            argv.local = local;

            return this.runCommand(SetupCommand, argv);
        });
    }

    version(ctx) {
        const versionResolver = ctx.zip ?
            require('../utils/version-from-zip') :
            require('../utils/resolve-version');

        return versionResolver(ctx.zip || ctx.version).then((version) => {
            ctx.version = version;
            ctx.installPath = path.join(process.cwd(), 'versions', version);
        });
    }

    casper() {
        // Create a symlink to the theme from the current version
        return symlinkSync(
            path.join(process.cwd(), 'current', 'content', 'themes', 'casper'),
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
InstallCommand.longDescription = '$0 install [version|local]\n Installs a new version of Ghost. Run `ghost install local` to install for local theme development/testing';
InstallCommand.params = '[version]';
InstallCommand.options = {
    dir: {
        alias: 'd',
        description: 'Folder to install Ghost in',
        type: 'string'
    },
    zip: {
        description: 'Path to Ghost release zip to install',
        type: 'string'
    },
    stack: {
        description: '[--no-stack] Enable/Disable system stack checks on install',
        type: 'boolean',
        default: true
    },
    setup: {
        description: '[--no-setup] Enable/Disable auto-running the setup command',
        type: 'boolean',
        default: true
    }
};

module.exports = InstallCommand;
