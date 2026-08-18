'use strict';
const os = require('os');
const path = require('path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const chalk = require('chalk').default;
const {execa} = require('execa');
const cliPackage = require('../../package.json');
const packageInfo = require('package-json').default;
const {prerelease, satisfies} = require('semver');

const {ProcessError, SystemError} = require('../errors');
const archive = require('../utils/archive');
const yarn = require('../utils/yarn');
const pnpm = require('../utils/pnpm');

function usePnpm(installPath) {
    return fs.existsSync(path.join(installPath, 'pnpm-lock.yaml'));
}

/**
 * Fetches the tarball for a given version of Ghost from the registry using
 * `npm pack`, which verifies the integrity hash of the downloaded file for us.
 * Returns the path to the downloaded tarball.
 */
async function npmPack(version, destination) {
    let result;

    try {
        // npm resolves its config (including proxy settings) relative to the cwd,
        // so run in the empty temp dir to avoid picking up any local project config
        result = await execa('npm', ['pack', `ghost@${version}`, '--json'], {cwd: destination});
    } catch (error) {
        throw new ProcessError(error);
    }

    // `npm pack --json` is expected to print a JSON array of packed tarballs, but a
    // misbehaving npm/registry/proxy can exit 0 while printing an error object or
    // other output. Guard so we surface npm's actual output instead of a cryptic
    // "object is not iterable" from the array destructuring below.
    let parsed;
    try {
        parsed = JSON.parse(result.stdout);
    } catch {
        throw new ProcessError({...result, message: `Could not parse 'npm pack' output for ghost@${version}.`});
    }

    const filename = Array.isArray(parsed) && parsed[0] && parsed[0].filename;
    if (typeof filename !== 'string' || !filename.trim()) {
        throw new ProcessError({...result, message: `'npm pack' did not return a tarball for ghost@${version}.`});
    }

    return path.join(destination, filename);
}

async function extractRelease(archivePath, installPath) {
    try {
        await archive.extract(archivePath, installPath);
    } catch (error) {
        // Clean up the install folder since the extraction failed
        await fsp.rm(installPath, {recursive: true, force: true});
        throw error;
    }
}

const subTasks = {
    async compatibility(ctx) {
        const {engines = {}} = await packageInfo('ghost', {version: ctx.version});

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
        const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'ghost-cli-'));

        try {
            const tarball = await npmPack(ctx.version, tmpDir);
            await extractRelease(tarball, ctx.installPath);
        } finally {
            await fsp.rm(tmpDir, {recursive: true, force: true});
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
            output.on('error', () => fs.rmSync(ctx.installPath, {recursive: true, force: true}));

            return output;
        }
    });

    return ui.listr(tasks, false);
};
module.exports.subTasks = subTasks;
