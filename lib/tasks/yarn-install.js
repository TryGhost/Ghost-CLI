'use strict';
const fs = require('fs-extra');
const chalk = require('chalk');
const shasum = require('shasum');
const download = require('download');
const decompress = require('decompress');
const cliPackage = require('../../package.json');
const packageInfo = require('package-json');
const {prerelease, satisfies} = require('semver');

const {CliError, SystemError} = require('../errors');
const yarn = require('../utils/yarn');
const getProxyAgent = require('../utils/get-proxy-agent');

const subTasks = {
    async dist(ctx) {
        const {dist, engines = {}} = await packageInfo('ghost', {
            version: ctx.version,
            agent: getProxyAgent()
        });

        const skipNodeVersionCheck = (process.env.GHOST_NODE_VERSION_CHECK === 'false');
        const isPrerelease = Boolean(prerelease(cliPackage.version));

        if (!skipNodeVersionCheck && engines.node && !satisfies(process.versions.node, engines.node)) {
            throw new SystemError(
                `Ghost v${ctx.version} is not compatible with the current Node version.` +
                ` Your node version is ${process.versions.node}, but Ghost v${ctx.version} requires ${engines.node}`
            );
        }

        if (engines.cli && !isPrerelease && !satisfies(cliPackage.version, engines.cli)) {
            throw new SystemError({
                message: `Ghost v${ctx.version} is not compatible with this version of the CLI.` +
                ` Your CLI version is ${cliPackage.version}, but Ghost v${ctx.version} requires ${engines.cli}`,
                help: `Run ${chalk.cyan('`npm install -g ghost-cli@latest`')} to upgrade the CLI, then try again.`
            });
        }

        ctx.shasum = dist.shasum; // eslint-disable-line require-atomic-updates
        ctx.tarball = dist.tarball; // eslint-disable-line require-atomic-updates
    },

    async download(ctx) {
        const data = await download(ctx.tarball, {agent: getProxyAgent()});

        if (shasum(data) !== ctx.shasum) {
            // shasums don't match - this is not good
            throw new CliError('Ghost download integrity compromised.' +
                    'Cancelling install because of potential security issues');
        }

        fs.ensureDirSync(ctx.installPath);

        try {
            await decompress(data, ctx.installPath, {
                map: (file) => {
                    file.path = file.path.replace('package/', '');
                    return file;
                }
            });
        } catch (error) {
            // Clean up the install folder since the decompress failed
            fs.removeSync(ctx.installPath);
            throw error;
        }
    }
};

module.exports = function yarnInstall(ui, zipFile) {
    const tasks = zipFile ? [{
        title: 'Extracting release from local zip',
        task: ctx => decompress(zipFile, ctx.installPath)
    }] : [{
        title: 'Getting download information',
        task: subTasks.dist
    }, {
        title: 'Downloading',
        task: subTasks.download
    }];

    tasks.push({
        title: 'Installing dependencies',
        task: (ctx) => {
            const args = ['install', '--no-emoji', '--no-progress'];
            if (process.env.GHOST_NODE_VERSION_CHECK === 'false') {
                args.push('--ignore-engines');
            }

            const observable = yarn(args, {
                cwd: ctx.installPath,
                env: {NODE_ENV: 'production', YARN_IGNORE_PATH: 'true'},
                observe: true,
                verbose: ui.verbose || false
            });

            observable.subscribe({
                // Add error catcher so we can cleanup the install path if an error occurs
                error: () => fs.removeSync(ctx.installPath)
            });

            return observable;
        }
    });

    return ui.listr(tasks, false);
};
module.exports.subTasks = subTasks;
