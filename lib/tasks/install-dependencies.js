'use strict';
const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk').default;
const {execa} = require('execa');
const cliPackage = require('../../package.json');
const packageInfo = require('package-json').default;
const {prerelease, satisfies} = require('semver');

const {ProcessError, SystemError} = require('../errors');
const archive = require('../utils/archive');
const yarn = require('../utils/yarn');
const pnpm = require('../utils/pnpm');
const getProxyAgent = require('../utils/get-proxy-agent');

function usePnpm(installPath) {
    return fs.existsSync(path.join(installPath, 'pnpm-lock.yaml'));
}

/**
 * Fetches the tarball for a given version of Ghost from the registry using
 * `npm pack`, which verifies the integrity hash of the downloaded file for us.
 * Returns the path to the downloaded tarball.
 */
async function npmPack(version, destination) {
    let stdout;

    try {
        // npm resolves its config (including proxy settings) relative to the cwd,
        // so run in the empty temp dir to avoid picking up any local project config
        ({stdout} = await execa('npm', ['pack', `ghost@${version}`, '--json'], {cwd: destination}));
    } catch (error) {
        throw new ProcessError(error);
    }

    const [{filename}] = JSON.parse(stdout);
    return path.join(destination, filename);
}

async function extractRelease(archivePath, installPath) {
    try {
        await archive.extract(archivePath, installPath);
    } catch (error) {
        // Clean up the install folder since the extraction failed
        fs.removeSync(installPath);
        throw error;
    }
}

const subTasks = {
    async compatibility(ctx) {
        const proxyAgent = getProxyAgent();
        const {engines = {}} = await packageInfo('ghost', {
            version: ctx.version,
            agent: proxyAgent ? {https: proxyAgent} : false
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
    },

    async download(ctx) {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-cli-'));

        try {
            const tarball = await npmPack(ctx.version, tmpDir);
            await extractRelease(tarball, ctx.installPath);
        } finally {
            fs.removeSync(tmpDir);
        }
    }
};

module.exports = function installDependencies(ui, archiveFile) {
    const tasks = archiveFile ? [{
        title: 'Extracting release from local archive file',
        task: ctx => extractRelease(archiveFile, ctx.installPath)
    }] : [{
        title: 'Checking version compatibility',
        task: subTasks.compatibility
    }, {
        title: 'Downloading',
        task: subTasks.download
    }];

    tasks.push({
        title: 'Installing dependencies',
        task: (ctx) => {
            let output;

            if (usePnpm(ctx.installPath)) {
                // Keep pnpm's content-addressable store inside the instance directory
                // (a sibling of `versions/`) instead of the invoking user's home dir.
                // This keeps the store on the same filesystem as node_modules (so pnpm
                // can hardlink), guarantees it's writable by the invoking user, and
                // avoids pnpm 11's SQLite store index failing with "attempt to write a
                // readonly database" when $HOME is on a network mount (NFS/SMB) or the
                // default store was left owned by another user (e.g. a prior root run).
                const storeDir = path.join(path.dirname(path.dirname(ctx.installPath)), '.pnpm-store');
                output = pnpm(['install', '--prod', `--store-dir=${storeDir}`, '--reporter=append-only'], {
                    cwd: ctx.installPath,
                    env: {NODE_ENV: 'production', COREPACK_DEFAULT_TO_LATEST: '0'},
                    observe: true
                });
            } else {
                const args = ['install', '--no-emoji', '--no-progress'];
                if (process.env.GHOST_NODE_VERSION_CHECK === 'false') {
                    args.push('--ignore-engines');
                }

                output = yarn(args, {
                    cwd: ctx.installPath,
                    env: {NODE_ENV: 'production', YARN_IGNORE_PATH: 'true'},
                    observe: true,
                    verbose: ui.verbose || false
                });
            }

            // Add error catcher so we can cleanup the install path if an error occurs
            output.on('error', () => fs.removeSync(ctx.installPath));

            return output;
        }
    });

    return ui.listr(tasks, false);
};
module.exports.subTasks = subTasks;
