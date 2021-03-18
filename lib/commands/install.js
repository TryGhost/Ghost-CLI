const fs = require('fs-extra');
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

    async run(argv) {
        const errors = require('../errors');
        const yarnInstall = require('../tasks/yarn-install');
        const dirIsEmpty = require('../utils/dir-is-empty');
        const ensureStructure = require('../tasks/ensure-structure');

        // if version is a single number (i.e. 2) yargs converts it to a number.
        // We convert it back to a string for consistency
        let version = argv.version ? `${argv.version}` : null;

        // Check if the directory is empty
        if (!dirIsEmpty(process.cwd()) && argv['check-empty']) {
            throw new errors.SystemError('Current directory is not empty, Ghost cannot be installed here.');
        }

        let local = false;

        // If command is `ghost install local`, or command is
        // `ghost install 1.x.x --local`, do a local install
        if (version === 'local' || argv.local || (argv._ && argv._.includes('local'))) {
            local = true;
            version = (version === 'local') ? null : version;
            this.system.setEnvironment(true, true);
        }

        if (argv.channel && argv.channel !== 'stable' && !local) {
            this.ui.log(`Warning: Using release channel '${argv.channel}' in production is intended for testing purposes only.`, 'yellow');
        }

        await this.runCommand(DoctorCommand, {
            categories: ['install'],
            skipInstanceCheck: true,
            quiet: true,
            ...argv,
            local
        });

        try {
            await this.ui.listr([{
                title: 'Checking for latest Ghost version',
                task: this.version
            }, {
                title: 'Setting up install directory',
                task: ensureStructure
            }, {
                title: 'Downloading and installing Ghost',
                task: (ctx, task) => {
                    task.title = `Downloading and installing Ghost v${ctx.version}`;
                    return yarnInstall(ctx.ui, ctx.argv.zip);
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
                argv: {...argv, version},
                cliVersion: this.system.cliVersion
            });
        } catch (error) {
            this.cleanInstallDirectory();
            throw error;
        }

        if (!argv.setup) {
            return;
        }

        argv.local = local;
        return this.runCommand(SetupCommand, argv);
    }

    async version(ctx) {
        const semver = require('semver');
        const {SystemError} = require('../errors');
        const {resolveVersion, versionFromZip} = require('../utils/version');
        let {version, zip, v1, fromExport, force, channel} = ctx.argv;
        let exportVersion = null;

        if (fromExport) {
            const {parseExport} = require('../tasks/import');
            const parsed = parseExport(fromExport);

            exportVersion = parsed.version;

            if (semver.major(exportVersion) === 0) {
                ctx.ui.log('Detected a v0.x export file. Installing latest v1.x version.', 'green');
                version = 'v1';
            } else if (!version) {
                version = exportVersion;
            }
        }

        if (version && zip) {
            ctx.ui.log('Warning: you specified both a specific version and a zip file. The version in the zip file will be used.', 'yellow');
        }

        let resolvedVersion = null;
        if (zip) {
            resolvedVersion = await versionFromZip(zip);
        } else {
            resolvedVersion = await resolveVersion(version, null, {v1, force, channel});
        }

        if (exportVersion && semver.lt(resolvedVersion, exportVersion)) {
            throw new SystemError(`Cannot import an export from v${exportVersion} into v${resolvedVersion} of Ghost.`);
        }

        ctx.version = resolvedVersion; // eslint-disable-line require-atomic-updates
        ctx.installPath = path.join(process.cwd(), 'versions', resolvedVersion); // eslint-disable-line require-atomic-updates
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
        instance.channel = ctx.argv.channel || 'stable';
    }

    cleanInstallDirectory() {
        const cwd = process.cwd();
        fs.readdirSync(cwd).map(file => fs.removeSync(file));
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
    },
    'from-export': {
        alias: 'f',
        description: 'Path to a Ghost export file to import after setup',
        type: 'string'
    },
    'check-empty': {
        description: 'Check for empty directory before installing',
        type: 'boolean',
        default: true
    },
    force: {
        description: 'Force installing a particular version',
        type: 'boolean'
    },
    channel: {
        description: 'Specifies a release channel to use when selecting Ghost versions',
        type: 'string',
        choices: ['stable', 'next'],
        default: 'stable'
    }
};
InstallCommand.runPreChecks = true;
InstallCommand.ensureDir = true;

module.exports = InstallCommand;
