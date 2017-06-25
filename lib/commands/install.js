'use strict';
const fs = require('fs-extra');
const path = require('path');
const every = require('lodash/every');
const Listr = require('listr');
const Promise = require('bluebird');
const Command = require('../command');
const symlinkSync = require('symlink-or-copy').sync;

// Utils
const resolveVersion = require('../utils/resolve-version');
const Config = require('../utils/config');
const errors = require('../errors');

// Tasks/Commands
const installChecks = require('./doctor/checks/install');
const ensureStructure = require('../tasks/ensure-structure');
const yarnInstall = require('../tasks/yarn-install');
const SetupCommand = require('./setup');

class InstallCommand extends Command {
    static configureOptions(commandName, yargs) {
        yargs = super.configureOptions(commandName, yargs);
        return SetupCommand.configureOptions('setup', yargs);
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
            this.development = true;
            this.environment = 'development';
        }

        return new Listr([{
            title: 'Checking for latest Ghost version',
            task: this.constructor.tasks.version
        }, {
            title: 'Running system checks',
            task: (ctx) => new Listr(installChecks, {concurrent: true, renderer: ctx.renderer})
        }, {
            title: 'Setting up install directory',
            task: ensureStructure
        }, {
            title: 'Downloading and installing Ghost',
            task: (ctx, task) => {
                task.title = `Downloading and installing Ghost v${ctx.version}`;
                return yarnInstall(ctx.renderer);
            }
        }, {
            title: 'Moving files',
            task: () => new Listr([{
                title: 'Summoning Casper',
                task: this.constructor.tasks.casper
            }, {
                title: 'Linking things',
                task: this.constructor.tasks.link
            }], {concurrent: true})
        }], {renderer: this.renderer}).run({
            version: version,
            cliVersion: this.cliVersion,
            renderer: this.renderer
        }).then(() => {
            if (argv.noSetup) {
                return;
            }
            argv.local = local;

            let setup = new SetupCommand(this);
            return setup.run(argv);
        });
    }
}

InstallCommand.tasks = {
    version: (ctx) => {
        return resolveVersion(ctx.version).then((version) => {
            ctx.version = version;
            ctx.installPath = path.join(process.cwd(), 'versions', version);
        });
    },
    casper: (ctx) => {
        const move = Promise.promisify(fs.move);

        // TODO: this should be re-thought
        return move(
            path.join(ctx.installPath, 'content', 'themes', 'casper'),
            path.join(process.cwd(), 'content', 'themes', 'casper')
        );
    },
    link: (ctx) => {
        let cliConfig = Config.load('.ghost-cli');

        symlinkSync(ctx.installPath, path.join(process.cwd(), 'current'));

        // Make sure we save the current cli version to the config
        // also - this ensures the config exists so the config command
        // doesn't throw errors
        cliConfig.set('cli-version', ctx.cliVersion)
            .set('active-version', ctx.version).save();
    }
};

InstallCommand.global = true;
InstallCommand.description = 'Install a brand new instance of Ghost';
InstallCommand.params = '[version]';
InstallCommand.options = {
    dir: {
        alias: 'd',
        description: 'Folder to install Ghost in',
        type: 'string'
    },
    noSetup: {
        alias: 'N',
        description: 'Don\'t automatically run the setup command',
        type: 'boolean'
    }
};

module.exports = InstallCommand;
