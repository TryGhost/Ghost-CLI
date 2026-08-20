'use strict';
const fs = require('node:fs');
const path = require('node:path');
const tar = require('tar');

const PACKAGE_JSON = 'package.json';

const TARBALL_EXTENSIONS = ['.tar.gz', '.tgz'];
const SUPPORTED_EXTENSIONS = [...TARBALL_EXTENSIONS, '.zip'];

// can't use path.extname here, it returns `.gz` for `.tar.gz` files
function hasExtension(archivePath, extensions) {
    const normalized = archivePath.toLowerCase();
    return extensions.some(extension => normalized.endsWith(extension));
}

function isTarball(archivePath) {
    return hasExtension(archivePath, TARBALL_EXTENSIONS);
}

// tar entry paths can be prefixed with `./`
function normalizeEntryPath(entryPath) {
    return entryPath.replace(/^\.\//, '');
}

// npm tarballs wrap everything in a `package/` dir, release zips usually don't,
// so an entry matches if it's either at the top level or one dir deep
function entryMatcher(entry) {
    return (entryPath) => {
        const normalized = normalizeEntryPath(entryPath);
        return normalized === entry ||
            (normalized.endsWith(`/${entry}`) && normalized.split('/').length === 2);
    };
}

/**
 * If everything ended up inside a single wrapper dir (as it does for npm
 * tarballs and some release zips), move the contents up into the destination.
 */
async function unwrap(destination) {
    if (fs.existsSync(path.join(destination, PACKAGE_JSON))) {
        return;
    }

    const entries = await fs.promises.readdir(destination);
    if (entries.length !== 1) {
        return;
    }

    const wrapper = path.join(destination, entries[0]);
    if (!fs.existsSync(path.join(wrapper, PACKAGE_JSON))) {
        return;
    }

    const wrapped = await fs.promises.readdir(wrapper);
    await Promise.all(wrapped.map(entry => fs.promises.rename(
        path.join(wrapper, entry),
        path.join(destination, entry)
    )));
    await fs.promises.rmdir(wrapper);
}

const utils = {
    /**
     * Whether the given path looks like an archive format we know how to read.
     */
    isSupported(archivePath) {
        return hasExtension(archivePath, SUPPORTED_EXTENSIONS);
    },

    /**
     * Extracts a Ghost release archive (an npm tarball or a zip file) into the
     * destination directory, creating it if it doesn't exist. Archives that wrap
     * their contents in a single dir are unwrapped, so the destination always
     * ends up with the release itself at the top level.
     */
    async extract(archivePath, destination) {
        await fs.promises.mkdir(destination, {recursive: true});

        if (isTarball(archivePath)) {
            await tar.x({file: archivePath, cwd: destination});
        } else {
            // zips are only used by `--zip` installs, so don't load the zip deps unless we need them
            const zip = require('@tryghost/zip');
            await zip.extract(archivePath, destination);
        }

        return unwrap(destination);
    },

    /**
     * Reads the package.json out of a release archive without extracting the
     * rest of it. Resolves with the parsed contents, or null if the archive
     * doesn't contain a valid package.json. Rejects if the archive can't be read.
     */
    async readPackageJson(archivePath) {
        const contents = isTarball(archivePath) ?
            await utils.readTarballEntry(archivePath, PACKAGE_JSON) :
            await utils.readZipEntry(archivePath, PACKAGE_JSON);

        if (!contents) {
            return null;
        }

        try {
            return JSON.parse(contents.toString());
        } catch {
            return null;
        }
    },

    async readTarballEntry(archivePath, entry) {
        const matches = entryMatcher(entry);
        let contents = null;

        await tar.t({
            file: archivePath,
            onReadEntry(tarEntry) {
                if (contents || !matches(tarEntry.path)) {
                    // entries have to be drained, otherwise the read stalls
                    return tarEntry.resume();
                }

                const chunks = [];
                tarEntry.on('data', chunk => chunks.push(chunk));
                tarEntry.on('end', () => {
                    contents = Buffer.concat(chunks);
                });
            }
        });

        return contents;
    },

    async readZipEntry(archivePath, entry) {
        const StreamZip = require('node-stream-zip');
        const archive = new StreamZip.async({file: archivePath});
        const matches = entryMatcher(entry);

        try {
            const name = Object.keys(await archive.entries()).find(matches);
            return name ? await archive.entryData(name) : null;
        } finally {
            await archive.close();
        }
    }
};

module.exports = utils;
