'use strict';
const fs = require('fs-extra');
const path = require('path');
const Listr = require('listr');
const Promise = require('bluebird');
const symlinkSync = require('symlink-or-copy').sync;

// Utils
const resolveVersion = require('../utils/resolve-version');
const Config = require('../utils/config');
const errors = require('../errors');

// Tasks/Commands
const installChecks = require('./doctor/checks/install');
const ensureStructure = require('../tasks/ensure-structure');
const yarnInstall = require('../tasks/yarn-install');
const setupCommand = require('./setup');

const tasks = {
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

module.exports.tasks = tasks;
module.exports.execute = function execute(version, options) {
    // Dir was specified, so we make sure it exists and chdir into it.
    if (options.dir) {
        let dir = path.resolve(options.dir);

        fs.ensureDirSync(dir);
        process.chdir(dir);
    }

    if (fs.readdirSync(process.cwd()).length) {
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
        task: tasks.version
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
            task: tasks.casper
        }, {
            title: 'Linking things',
            task: tasks.link
        }], {concurrent: true})
    }], {renderer: this.renderer}).run({
        version: version,
        cliVersion: options.parent._version,
        renderer: this.renderer
    }).then(() => {
        if (!options.setup) {
            return;
        }

        options.local = local;

        return setupCommand.execute.call(this, options);
    });
};
