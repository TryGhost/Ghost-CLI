'use strict';
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('path');

const ghostUser = require('../../utils/use-ghost-user');
const {ProcessError} = require('../../errors');
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

/**
 * Copies a path, shelling out via sudo when the source is owned by the `ghost` user
 *
 * @param {import('../../ui/index.js')} ui
 * @param {boolean} useSudo
 * @param {string} source
 * @param {string} destination
 */
async function copy(ui, useSudo, source, destination) {
    if (useSudo) {
        await ui.sudo(`cp -R ${source} ${destination}`);
        return;
    }

    await fsp.cp(source, destination, {recursive: true});
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

    await fsp.mkdir(destination, {recursive: true});

    for (const dir of CONTENT_DIRS) {
        const source = path.join(contentDir, dir);

        if (fs.existsSync(source)) {
            await copy(ui, useSudo, source, path.join(destination, dir));
        }
    }

    const dataFiles = DATA_FILES.filter(file => fs.existsSync(path.join(contentDir, 'data', file)));

    if (dataFiles.length) {
        await fsp.mkdir(path.join(destination, 'data'), {recursive: true});

        for (const file of dataFiles) {
            await copy(ui, useSudo, path.join(contentDir, 'data', file), path.join(destination, 'data', file));
        }
    }

    if (useSudo) {
        // Hand the copies back to whoever ran the command so the bundle stays usable
        await ui.sudo(`chown -R ${process.getuid()}:${process.getgid()} ${destination}`);
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
    return zip.compress(source, destination);
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
        kind,
        path: DATABASE_DUMP_FILE
    } : {
        kind,
        path: `content/data/${contentExportFile}`,
        members: `content/data/${membersExportFile}`
    };

    return {
        bundleVersion: BUNDLE_VERSION,
        ghostVersion: instance.version,
        sourceEnvironment: instance.system.environment,
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
 * started in.
 *
 * @param {import('../../ui/index.js')} ui
 * @param {import('../../instance.js')} instance
 * @param {object} options
 * @param {string} [options.output] Path of the bundle to create
 * @param {'tgz'|'zip'} [options.archive] Compress the bundle into a single archive
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

    // 0700 - the bundle carries whatever secrets the install's config holds
    await fsp.mkdir(bundleDir, {recursive: true, mode: 0o700});

    const wasRunning = await instance.isRunning();
    let restarted = false;

    const tasks = [{
        // Goes through Ghost's admin API, so it has to run before Ghost is stopped
        title: 'Exporting content',
        enabled: () => kind === 'portable',
        task: async () => {
            await fsp.mkdir(dataDir, {recursive: true});
            await exportTask(ui, instance, path.join(dataDir, contentExportFile), path.join(dataDir, membersExportFile));
        }
    }, {
        title: 'Stopping Ghost',
        enabled: () => wasRunning,
        task: () => instance.stop()
    }, {
        title: 'Copying content files',
        task: () => copyContent(ui, contentDir, path.join(bundleDir, 'content'))
    }, {
        title: 'Dumping database',
        enabled: () => kind === 'mysql-dump',
        task: () => dumpDatabase(instance, path.join(bundleDir, DATABASE_DUMP_FILE))
    }, {
        // Everything that needed Ghost down is done, so put the site back up before
        // spending time on the manifest and (potentially very slow) compression
        title: 'Restarting Ghost',
        enabled: () => wasRunning,
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
            ctx.bundlePath = `${bundleDir}.${options.archive}`;

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
        await ui.listr(tasks, context);
    } finally {
        // Listr stops at the first failure, so the restart task may never have run.
        // The instance has to go back up either way - the export is non-destructive.
        if (wasRunning && !restarted) {
            await ui.run(() => instance.start(), 'Restarting Ghost');
        }
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
