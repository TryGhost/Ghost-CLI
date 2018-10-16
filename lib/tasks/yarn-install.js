'use strict';
const path = require('path');
const fs = require('fs-extra');
const semver = require('semver');
const shasum = require('shasum');
const download = require('download');
const decompress = require('decompress');
const cliPackage = require('../../package.json');

const errors = require('../errors');
const yarn = require('../utils/yarn');

const subTasks = {
    dist: ctx => yarn(['info', `ghost@${ctx.version}`, '--json']).then((result) => {
        let data;

        try {
            const parsed = JSON.parse(result.stdout);
            data = parsed && parsed.data;
        } catch (e) {
            // invalid response from yarn command, ignore JSON parse error
        }

        if (!data || !data.dist) {
            return Promise.reject(new errors.CliError('Ghost download information could not be read correctly.'));
        }

        if (
            process.env.GHOST_NODE_VERSION_CHECK !== 'false' &&
                data.engines && data.engines.node && !semver.satisfies(process.versions.node, data.engines.node)
        ) {
            return Promise.reject(new errors.SystemError(`Ghost v${ctx.version} is not compatible with the current Node version.`));
        }

        if (data.engines && data.engines.cli && !semver.satisfies(cliPackage.version, data.engines.cli)) {
            return Promise.reject(new errors.SystemError(`Ghost v${ctx.version} is not compatible with this version of the CLI.`));
        }

        ctx.shasum = data.dist.shasum;
        ctx.tarball = data.dist.tarball;
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
    }),
    cloneModules: (ctx) => {
        const {previousVersion, dir} = ctx.instance;
        const source = path.join(dir, 'versions', previousVersion, 'node_modules');
        const dest = path.join(ctx.installPath, 'node_modules');
        return fs.copy(source, dest).catch((error) => {
            // If the node_modules folder doesn't exist, that's fine
            if (error.code === 'ENOENT') {
                return Promise.resolve();
            }

            return Promise.reject(error);
        });
    }
};

module.exports = function yarnInstall(ui, zipFile, cloneModules = false) {
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

    if (cloneModules) {
        tasks.push({
            title: 'Copying node_modules folder',
            task: subTasks.cloneModules
        });
    }

    tasks.push({
        title: 'Installing dependencies',
        task: ctx => yarn(['install', '--no-emoji', '--no-progress'], {
            cwd: ctx.installPath,
            env: {NODE_ENV: 'production'},
            observe: true
        }).catch((error) => {
            // Add error catcher so we can cleanup the install path if an error occurs
            fs.removeSync(ctx.installPath);
            return Promise.reject(error);
        })
    });

    return ui.listr(tasks, false);
};
module.exports.subTasks = subTasks;
