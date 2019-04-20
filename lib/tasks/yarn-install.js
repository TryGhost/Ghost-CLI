'use strict';
const fs = require('fs-extra');
const shasum = require('shasum');
const download = require('download');
const decompress = require('decompress');
const cliPackage = require('../../package.json');
const packageInfo = require('package-json');
const {prerelease, satisfies} = require('semver');

const errors = require('../errors');
const yarn = require('../utils/yarn');

const subTasks = {
    dist: ctx => packageInfo('ghost', {version: ctx.version}).then(({dist, engines = {}}) => {
        const skipNodeVersionCheck = (process.env.GHOST_NODE_VERSION_CHECK === 'false');
        const isPrerelease = Boolean(prerelease(cliPackage.version));

        if (!skipNodeVersionCheck && engines.node && !satisfies(process.versions.node, engines.node)) {
            return Promise.reject(new errors.SystemError(`Ghost v${ctx.version} is not compatible with the current Node version.`));
        }

        if (engines.cli && !isPrerelease && !satisfies(cliPackage.version, engines.cli)) {
            return Promise.reject(new errors.SystemError(`Ghost v${ctx.version} is not compatible with this version of the CLI.`));
        }

        ctx.shasum = dist.shasum;
        ctx.tarball = dist.tarball;
    }),
    download: ctx => download(ctx.tarball).then((data) => {
        if (shasum(data) !== ctx.shasum) {
            // shasums don't match - this is not good
            return Promise.reject(new errors.CliError('Ghost download integrity compromised.' +
                    'Cancelling install because of potential security issues'));
        }

        fs.ensureDirSync(ctx.installPath);
        return decompress(data, ctx.installPath, {
            map: (file) => {
                file.path = file.path.replace('package/', '');
                return file;
            }
        }).catch((error) => {
            // Clean up the install folder since the decompress failed
            fs.removeSync(ctx.installPath);
            return Promise.reject(error);
        });
    })
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
            const observable = yarn(['install', '--no-emoji', '--no-progress'], {
                cwd: ctx.installPath,
                env: {NODE_ENV: 'production'},
                observe: true
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
