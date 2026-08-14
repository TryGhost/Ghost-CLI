'use strict';
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const tar = require('tar');

const PACKAGE_JSON = 'package.json';
// npm tarballs wrap everything in a `package/` dir, release zips don't
const TARBALL_ROOT = 'package';

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

const utils = {
    /**
     * Whether the given path looks like an archive format we know how to read.
     */
    isSupported(archivePath) {
        return hasExtension(archivePath, SUPPORTED_EXTENSIONS);
    },

    /**
     * Extracts a Ghost release archive (an npm tarball or a zip file) into the
     * destination directory, creating it if it doesn't exist.
     */
    async extract(archivePath, destination) {
        await fs.promises.mkdir(destination, {recursive: true});

        if (isTarball(archivePath)) {
            // strip the leading `package/` dir that npm tarballs are wrapped in
            return tar.x({file: archivePath, cwd: destination, strip: 1});
        }

        // zips are only used by `--zip` installs, so don't load the zip deps unless we need them
        const zip = require('@tryghost/zip');
        return zip.extract(archivePath, destination);
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
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-cli-'));

        try {
            await tar.x({file: archivePath, cwd: tmpDir, strip: 1}, [`${TARBALL_ROOT}/${entry}`]);

            const extracted = path.join(tmpDir, entry);
            // tar resolves without error when nothing matches the entry list
            return fs.existsSync(extracted) ? fs.readFileSync(extracted) : null;
        } finally {
            fs.rmSync(tmpDir, {recursive: true, force: true});
        }
    },

    async readZipEntry(archivePath, entry) {
        const StreamZip = require('node-stream-zip');
        const archive = new StreamZip.async({file: archivePath});

        try {
            return await archive.entry(entry) ? await archive.entryData(entry) : null;
        } finally {
            await archive.close();
        }
    }
};

module.exports = utils;
