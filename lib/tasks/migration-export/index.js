'use strict';
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('path');
const {pipeline} = require('node:stream/promises');

const ghostUser = require('../../utils/use-ghost-user');
const {ProcessError, SystemError} = require('../../errors');
const {exportTask} = require('../import');
const {timestamp} = require('../backup');
const {databaseKind, dumpDatabase} = require('./database');
const {configToEnv, sensitiveKeys} = require('./config-to-env');

const BUNDLE_VERSION = 1;
const DATABASE_DUMP_FILE = 'database.sql';

// The content subdirectories that travel with a bundle. `logs` and `apps` are
// runtime state rather than site content, and `data` is handled separately
// because it also holds the SQLite database we never copy.
const CONTENT_DIRS = ['files', 'images', 'media', 'settings', 'themes'];
const DATA_FILES = ['redirects.json', 'redirects.yaml'];

// Match the shell quoting used by ui.sudo for executable paths.
function shellQuote(arg) {
    return `'${arg.replace(/'/g, '\'\\\'\'')}'`;
}

/**
 * Creates private destinations and validates supported file types. Local copies
 * stream into the reserved files; sudo copies fill them in a later step.
 *
 * @param {string} source
 * @param {string} destination
 * @param {boolean} reserveOnly
 */
async function prepareCopy(source, destination, reserveOnly) {
    const stat = await fsp.lstat(source);
    if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile())) {
        throw new SystemError(`Unsupported content link or special file: ${source}. Replace it with a regular file/directory before exporting.`);
    }

    if (stat.isDirectory()) {
        await fsp.mkdir(destination, {mode: 0o700});
        for (const entry of await fsp.readdir(source)) {
            await prepareCopy(path.join(source, entry), path.join(destination, entry), reserveOnly);
        }
        return;
    }

    // Reserve privately before either copy implementation writes any bytes.
    await fsp.writeFile(destination, '', {flag: 'wx', mode: 0o600});
    if (!reserveOnly) {
        await pipeline(fs.createReadStream(source), fs.createWriteStream(destination));
    }
}

async function copy(ui, useSudo, source, destination) {
    await prepareCopy(source, destination, useSudo);
    if (useSudo) {
        // All targets already exist privately. Merge a directory's contents,
        // including dotfiles, without creating an extra nested directory.
        const from = (await fsp.lstat(source)).isDirectory() ? `${source}/.` : source;
        await ui.sudo(`cp -R ${shellQuote(from)} ${shellQuote(destination)}`);
        await ui.sudo(`chown -R ${process.getuid()}:${process.getgid()} ${shellQuote(destination)}`);
    }
}

/**
 * Copies the instance's content directory into the bundle, laid out the way
 * Ghost expects to find it.
 *
 * @param {import('../../ui/index.js')} ui
 * @param {string} contentDir
 * @param {string} destination
 */
async function copyContent(ui, contentDir, destination) {
    const useSudo = ghostUser.shouldUseGhostUser(contentDir);

    await fsp.mkdir(destination, {recursive: true, mode: 0o700});

    for (const dir of CONTENT_DIRS) {
        const source = path.join(contentDir, dir);

        if (fs.existsSync(source)) {
            await copy(ui, useSudo, source, path.join(destination, dir));
        }
    }

    const dataFiles = DATA_FILES.filter(file => fs.existsSync(path.join(contentDir, 'data', file)));

    if (dataFiles.length) {
        await fsp.mkdir(path.join(destination, 'data'), {recursive: true, mode: 0o700});

        for (const file of dataFiles) {
            await copy(ui, useSudo, path.join(contentDir, 'data', file), path.join(destination, 'data', file));
        }
    }
}

/**
 * Compresses the finished bundle.
 *
 * `tgz` is the better default for moving a bundle between servers: `tar` is present
 * on every host, whereas `unzip` often isn't on a minimal server image. `portable`
 * keeps the source host's uid/gid/username out of the archive, so extracting it as
 * root on the target doesn't restore ownership that means nothing there.
 *
 * @param {'tgz'|'zip'} format
 * @param {string} source
 * @param {string} destination
 */
async function compressBundle(format, source, destination) {
    if (format === 'tgz') {
        const tar = require('tar');
        return tar.c({gzip: true, file: destination, cwd: source, portable: true}, ['.']);
    }

    const zip = require('@tryghost/zip');
    return zip.compress(source, destination, {ignore: []});
}

/**
 * @param {import('../../instance.js')} instance
 * @param {object} options
 * @param {string} options.kind
 * @param {{[key: string]: string}} options.config
 * @param {string} [options.contentExportFile]
 * @param {string} [options.membersExportFile]
 */
function buildManifest(instance, {kind, config, contentExportFile, membersExportFile}) {
    const database = kind === 'mysql-dump' ? {
        path: DATABASE_DUMP_FILE
    } : {
        path: `content/data/${contentExportFile}`,
        members: `content/data/${membersExportFile}`
    };

    return {
        bundleVersion: BUNDLE_VERSION,
        bundleCreatedAt: new Date().toISOString(),
        sourceInstallType: instance.isLocal ? 'local' : 'production',
        kind,
        ghost: {version: instance.version},
        url: instance.config.get('url'),
        // Only present when the install serves admin from a separate domain
        adminUrl: instance.config.get('admin.url') || undefined,
        database,
        content: 'content/',
        config
    };
}

/**
 * Exports an instance as a portable migration bundle. Non-destructive: nothing in
 * the source install is modified, and the instance is left in the state it
 * started in unless final cutover was explicitly requested.
 *
 * @param {import('../../ui/index.js')} ui
 * @param {import('../../instance.js')} instance
 * @param {object} options
 * @param {string} [options.output] Path of the bundle to create
 * @param {'tgz'|'zip'} [options.archive] Compress the bundle into a single archive
 * @param {boolean} [options.leaveStopped] Keep the source stopped for cutover
 * @param {string} [options.cwd] Directory relative paths resolve against
 * @return {Promise<{path: string, manifest: object, secrets: Array<string>}>}
 */
module.exports = async function migrationExport(ui, instance, options = {}) {
    const kind = databaseKind(instance);
    const suffix = `from-v${instance.version}-on-${timestamp()}`;

    // Resolved against the caller's cwd rather than the current one, so selecting an
    // instance by name doesn't drop the bundle inside the install we're exporting
    const bundleDir = path.resolve(options.cwd || process.cwd(), options.output || `ghost-migration-${instance.name}-${timestamp()}`);
    const contentDir = instance.config.get('paths.contentPath', path.join(instance.dir, 'content'));
    const dataDir = path.join(bundleDir, 'content', 'data');

    const contentExportFile = `content-${suffix}.json`;
    const membersExportFile = `members-${suffix}.csv`;

    if (options.archive && !['tgz', 'zip'].includes(options.archive)) {
        throw new SystemError('Unsupported archive format; use tgz or zip.');
    }

    // Require an existing parent so resolving symlink aliases is unambiguous.
    // Reserve both names before changing the source state. Never reuse a bundle.
    const parent = await fsp.realpath(path.dirname(bundleDir));
    const resolvedOutput = path.join(parent, path.basename(bundleDir));
    for (const source of [instance.dir, contentDir]) {
        const resolvedSource = await fsp.realpath(source);
        const overlaps = (a, b) => a === b || a.startsWith(`${b}${path.sep}`);
        if (overlaps(resolvedOutput, resolvedSource) || overlaps(resolvedSource, resolvedOutput)) {
            throw new SystemError('Output must be outside the source install and content directory.');
        }
    }

    const archivePath = options.archive ? `${bundleDir}.${options.archive}` : null;
    await fsp.mkdir(bundleDir, {mode: 0o700});
    try {
        if (archivePath) {
            await fsp.writeFile(archivePath, '', {flag: 'wx', mode: 0o600});
        }
    } catch (error) {
        await fsp.rm(bundleDir, {recursive: true, force: true});
        throw error;
    }

    let wasRunning;
    let stopped = false;
    let stopAttempted = false;
    let startedForExport = false;
    let restarted = false;
    let lifecycleStarted = false;
    let complete = false;
    let failure;

    const tasks = [{
        // Goes through Ghost's admin API, so it has to run before Ghost is stopped
        title: 'Exporting content',
        enabled: () => kind === 'portable',
        task: async () => {
            await fsp.mkdir(dataDir, {recursive: true, mode: 0o700});
            for (const file of [contentExportFile, membersExportFile]) {
                await fsp.writeFile(path.join(dataDir, file), '', {flag: 'wx', mode: 0o600});
            }
            await exportTask(ui, instance, path.join(dataDir, contentExportFile), path.join(dataDir, membersExportFile), {requireMembers: true});
            // Ghost emits no CSV header or rows when a site has no members. A
            // successful zero-byte members response is valid; content JSON is not.
            for (const file of [contentExportFile, membersExportFile]) {
                const {size} = await fsp.stat(path.join(dataDir, file));
                if (file === contentExportFile && !size) {
                    throw new SystemError(`Missing or empty portable export: ${file}`);
                }
            }
        }
    }, {
        title: 'Stopping Ghost',
        enabled: () => wasRunning || startedForExport,
        task: async () => {
            stopAttempted = true;
            await instance.stop();
            stopped = true;
        }
    }, {
        title: 'Copying content files',
        task: () => copyContent(ui, contentDir, path.join(bundleDir, 'content'))
    }, {
        title: 'Dumping database',
        enabled: () => kind === 'mysql-dump',
        task: async () => {
            const file = path.join(bundleDir, DATABASE_DUMP_FILE);
            await fsp.writeFile(file, '', {flag: 'wx', mode: 0o600});
            await dumpDatabase(instance, file);
        }
    }, {
        // Everything that needed Ghost down is done, so put the site back up before
        // spending time on the manifest and (potentially very slow) compression
        title: 'Restarting Ghost',
        enabled: () => wasRunning && !options.leaveStopped,
        task: async () => {
            await instance.start();
            restarted = true;
        }
    }, {
        title: 'Writing manifest',
        task: (ctx) => {
            ctx.config = configToEnv(instance.config.values);
            ctx.manifest = buildManifest(instance, {
                kind,
                config: ctx.config,
                contentExportFile,
                membersExportFile
            });

            return fsp.writeFile(path.join(bundleDir, 'manifest.json'), `${JSON.stringify(ctx.manifest, null, 2)}\n`, {mode: 0o600});
        }
    }, {
        title: 'Compressing bundle',
        enabled: () => Boolean(options.archive),
        task: async (ctx) => {
            ctx.bundlePath = archivePath;

            try {
                await compressBundle(options.archive, bundleDir, ctx.bundlePath);
            } catch (error) {
                throw new ProcessError(error);
            }

            await fsp.rm(bundleDir, {recursive: true, force: true});
            await fsp.chmod(ctx.bundlePath, 0o600);
        }
    }];

    const context = {};

    try {
        wasRunning = await instance.isRunning();
        stopped = !wasRunning;
        if (kind === 'portable' && !wasRunning) {
            const shouldStart = await ui.confirm('Ghost instance is not currently running. Would you like to start it for export?', true);
            if (!shouldStart) {
                throw new SystemError('Ghost instance is not currently running');
            }
            lifecycleStarted = true;
            startedForExport = true;
            stopped = false;
            await ui.run(() => instance.start(), 'Starting Ghost');
        }
        lifecycleStarted = true;
        if (kind === 'portable') {
            ui.log('Portable export captures content, members, then assets sequentially. Avoid editing until export finishes.', 'yellow');
        }
        await ui.listr(tasks, context);
        complete = true;
    } catch (error) {
        failure = error;
    } finally {
        try {
            if (lifecycleStarted) {
                if ((options.leaveStopped || startedForExport) && !stopped) {
                    await ui.run(() => instance.stop(), 'Stopping Ghost');
                } else if (wasRunning && stopAttempted && !options.leaveStopped && !restarted) {
                    await ui.run(() => instance.start(), 'Restarting Ghost');
                }
            }
        } catch (error) {
            complete = false;
            ui.log('Could not restore the requested source state. Check ghost ls; use ghost start to recover or ghost stop for cutover.', 'red');
            failure = failure ? new AggregateError([failure, error], 'Export and source recovery failed. Check ghost ls before proceeding.') : error;
        } finally {
            if (!complete) {
                await fsp.rm(bundleDir, {recursive: true, force: true});
                if (archivePath) {
                    await fsp.rm(archivePath, {force: true});
                }
            }
            if (options.leaveStopped && lifecycleStarted) {
                ui.log('Final export selected: verify Ghost is stopped before cutover. To abandon cutover, run ghost start in the source install.', 'yellow');
            }
        }
    }

    if (failure) {
        throw failure;
    }

    return {
        path: context.bundlePath || bundleDir,
        manifest: context.manifest,
        secrets: sensitiveKeys(context.config)
    };
};

module.exports.BUNDLE_VERSION = BUNDLE_VERSION;
module.exports.copyContent = copyContent;
module.exports.buildManifest = buildManifest;
