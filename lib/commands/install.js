'use strict';
const path = require('path');
const Command = require('../command');
const symlinkSync = require('symlink-or-copy').sync;
const SetupCommand = require('./setup');
const DoctorCommand = require('./doctor');

class InstallCommand extends Command {
    static configureOptions(commandName, yargs, extensions) {
        yargs = super.configureOptions(commandName, yargs, extensions);
        yargs = SetupCommand.configureOptions('setup', yargs, extensions, true);

        return yargs;
    }

    run(argv) {
        const errors = require('../errors');
        const yarnInstall = require('../tasks/yarn-install');
        const dirIsEmpty = require('../utils/dir-is-empty');
        const ensureStructure = require('../tasks/ensure-structure');

        let version = argv.version;

        // Check if the directory is empty
        if (!dirIsEmpty(process.cwd())) {
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

        return this.runCommand(DoctorCommand, Object.assign({
            categories: ['install'],
            skipInstanceCheck: true,
            quiet: true
        }, argv, {local})).then(() => this.ui.listr([{
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
            version,
            zip: argv.zip,
            v1: argv.v1,
            cliVersion: this.system.cliVersion
        })).then(() => {
            if (!argv.setup) {
                return Promise.resolve();
            }

            argv.local = local;

            return this.runCommand(SetupCommand, argv);
        });
    }

    version(ctx) {
        const {version, zip, v1} = ctx;

        const resolveVersion = zip ?
            () => require('../utils/version-from-zip')(zip) :
            () => require('../utils/resolve-version')(version, null, v1);

        return resolveVersion().then((version) => {
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

        const instance = this.system.getInstance();

        instance.version = ctx.version;
        instance.cliVersion = this.system.cliVersion;
    }
}

InstallCommand.global = true;
InstallCommand.description = 'Install a brand new instance of Ghost';
InstallCommand.longDescription = '$0 install [version|local]\n Installs a new version of Ghost. Run `ghost install local` to install for local theme development/testing';
InstallCommand.params = '[version]';
InstallCommand.options = {
    // This overrides the description of the global option for this command
    dir: {
        alias: 'd',
        description: 'Folder to install Ghost in',
        type: 'string'
    },
    zip: {
        description: 'Path to Ghost release zip to install',
        type: 'string'
    },
    version1: {
        alias: 'v1',
        describe: 'Limit install to Ghost 1.x releases',
        type: 'boolean',
        default: false
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
InstallCommand.runPreChecks = true;
InstallCommand.ensureDir = true;

module.exports = InstallCommand;
