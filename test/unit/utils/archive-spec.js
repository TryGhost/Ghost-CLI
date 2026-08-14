'use strict';
const expect = require('chai').expect;
const fs = require('fs-extra');
const path = require('path');
const tar = require('tar');
const {setupTestFolder, cleanupTestFolders} = require('../../utils/test-folder');

const archive = require('../../../lib/utils/archive');
const fixturePath = name => path.join(__dirname, '../../fixtures', name);

/**
 * Builds an npm-style tarball (everything nested under `package/`) containing
 * the given files, and returns the path to it.
 */
function createTarball(dir, name, files) {
    const contents = path.join(dir, 'contents');

    Object.keys(files).forEach((file) => {
        fs.outputFileSync(path.join(contents, 'package', file), files[file]);
    });

    const tarball = path.join(dir, name);
    // tar.c doesn't infer compression from the file name, so ask for it explicitly
    tar.c({file: tarball, cwd: contents, sync: true, gzip: true}, ['package']);
    return tarball;
}

describe('Unit: Utils > archive', function () {
    after(() => {
        cleanupTestFolders();
    });

    describe('isSupported', function () {
        it('accepts every supported extension, regardless of case', function () {
            ['ghost.tgz', 'ghost.tar.gz', 'ghost.zip', 'GHOST.TAR.GZ'].forEach((file) => {
                expect(archive.isSupported(file), file).to.be.true;
            });
        });

        it('rejects unsupported extensions', function () {
            ['ghost.txt', 'ghost.gz', 'ghost.tar', 'ghost'].forEach((file) => {
                expect(archive.isSupported(file), file).to.be.false;
            });
        });
    });

    describe('extract', function () {
        it('treats .tar.gz files as tarballs', async function () {
            const env = setupTestFolder();
            const tarball = createTarball(env.dir, 'ghost.tar.gz', {'package.json': '{"name":"ghost"}'});
            const destination = path.join(env.dir, 'versions/1.0.0');

            await archive.extract(tarball, destination);

            expect(fs.readdirSync(destination)).to.deep.equal(['package.json']);
        });

        it('strips the wrapping package dir from tarballs', async function () {
            const env = setupTestFolder();
            const tarball = createTarball(env.dir, 'ghost.tgz', {
                'package.json': '{"name":"ghost"}',
                'index.js': 'module.exports = {};'
            });
            const destination = path.join(env.dir, 'versions/1.0.0');

            await archive.extract(tarball, destination);

            expect(fs.readdirSync(destination).sort()).to.deep.equal(['index.js', 'package.json']);
            expect(fs.existsSync(path.join(destination, 'package'))).to.be.false;
        });

        it('creates the destination dir if it does not exist', async function () {
            const env = setupTestFolder();
            const tarball = createTarball(env.dir, 'ghost.tgz', {'package.json': '{"name":"ghost"}'});
            const destination = path.join(env.dir, 'deeply/nested/target');

            await archive.extract(tarball, destination);

            expect(fs.existsSync(path.join(destination, 'package.json'))).to.be.true;
        });

        it('extracts zip files as-is', async function () {
            const env = setupTestFolder();
            const destination = path.join(env.dir, 'versions/1.5.0');

            await archive.extract(fixturePath('ghostrelease.zip'), destination);

            expect(fs.readdirSync(destination)).to.deep.equal(['package.json']);
        });

        it('rejects if the archive cannot be read', async function () {
            const env = setupTestFolder();

            try {
                await archive.extract(path.join(env.dir, 'nope.tgz'), path.join(env.dir, 'out'));
                expect(false, 'error should have been thrown').to.be.true;
            } catch (error) {
                expect(error.code).to.equal('ENOENT');
            }
        });
    });

    describe('readPackageJson', function () {
        it('reads package.json from a tarball', async function () {
            const env = setupTestFolder();
            const tarball = createTarball(env.dir, 'ghost.tgz', {
                'package.json': '{"name":"ghost","version":"1.5.0"}',
                'index.js': 'module.exports = {};'
            });

            const pkg = await archive.readPackageJson(tarball);
            expect(pkg).to.deep.equal({name: 'ghost', version: '1.5.0'});
        });

        it('reads package.json from a .tar.gz tarball', async function () {
            const env = setupTestFolder();
            const tarball = createTarball(env.dir, 'ghost.tar.gz', {
                'package.json': '{"name":"ghost","version":"1.5.0"}'
            });

            const pkg = await archive.readPackageJson(tarball);
            expect(pkg).to.deep.equal({name: 'ghost', version: '1.5.0'});
        });

        it('reads package.json from a zip file', async function () {
            const pkg = await archive.readPackageJson(fixturePath('ghostrelease.zip'));
            expect(pkg).to.deep.equal({name: 'ghost', version: '1.5.0'});
        });

        it('returns null if a tarball has no package.json', async function () {
            const env = setupTestFolder();
            const tarball = createTarball(env.dir, 'nopkg.tgz', {'guide.txt': 'not a package'});

            expect(await archive.readPackageJson(tarball)).to.be.null;
        });

        it('returns null if a zip file has no package.json', async function () {
            expect(await archive.readPackageJson(fixturePath('nopkg.zip'))).to.be.null;
        });

        it('returns null if package.json is not parseable', async function () {
            const env = setupTestFolder();
            const tarball = createTarball(env.dir, 'badpkg.tgz', {'package.json': 'not json'});

            expect(await archive.readPackageJson(tarball)).to.be.null;
        });

        it('rejects if the archive cannot be read', async function () {
            const env = setupTestFolder();

            try {
                await archive.readPackageJson(path.join(env.dir, 'nope.zip'));
                expect(false, 'error should have been thrown').to.be.true;
            } catch (error) {
                expect(error.code).to.equal('ENOENT');
            }
        });
    });
});
