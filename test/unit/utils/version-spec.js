const path = require('path');
const {expect} = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const {CliError, SystemError} = require('../../../lib/errors');

const modulePath = '../../../lib/utils/version';
const versionUtils = require(modulePath);

const {
    checkCustomVersion, checkActiveVersion, resolveVersion, versionFromZip
} = versionUtils;

describe('Unit: Utils: version', function () {
    describe('loadVersions', function () {
        const stub = (versionList = []) => {
            const versions = versionList.reduce((obj, v) => ({...obj, [v]: true}), {});
            const {loadVersions} = proxyquire(modulePath, {
                'package-json': async () => ({versions})
            });

            return loadVersions;
        };

        it('returns null/empty response if package-json returns an empty version list', async function () {
            const loadVersions = stub([]);
            const result = await loadVersions();

            expect(result).to.deep.equal({
                latest: null,
                latestMajor: {},
                all: []
            });
        });

        it('returns correct all versions/latest versions, sorted desc', async function () {
            const loadVersions = stub(['0.11.0', '1.0.0', '1.0.1', '1.0.2', '1.0.3', '1.0.4', '2.0.0', '2.1.0', '2.22.0', '3.0.0']);
            const result = await loadVersions();

            expect(result).to.deep.equal({
                latest: '3.0.0',
                latestMajor: {
                    v1: '1.0.4',
                    v2: '2.22.0',
                    v3: '3.0.0'
                },
                all: ['3.0.0', '2.22.0', '2.1.0', '2.0.0', '1.0.4', '1.0.3', '1.0.2', '1.0.1', '1.0.0']
            });
        });
    });

    describe('checkCustomVersion', function () {
        it('throws if custom version can\'t be coerced', function () {
            try {
                checkCustomVersion('not a version');
            } catch (error) {
                expect(error).to.be.an.instanceof(CliError);
                expect(error.message).to.contain('Invalid custom version');
                return;
            }

            expect.fail('expected an error to be thrown');
        });

        it('throws if custom version is less than v1', function () {
            try {
                checkCustomVersion('v0.11.0');
            } catch (error) {
                expect(error).to.be.an.instanceof(CliError);
                expect(error.message).to.contain('cannot install versions of Ghost less than 1.0.0');
                return;
            }

            expect.fail('expected an error to be thrown');
        });

        it('throws if version does not exist, and is not in a zip', function () {
            try {
                checkCustomVersion('v1.56.0', ['1.0.0', '1.0.1', '1.0.2'], null, {zip: false});
            } catch (error) {
                expect(error).to.be.an.instanceof(CliError);
                expect(error.message).to.contain('Version 1.56.0 does not exist');
                return;
            }

            expect.fail('expected an error to be thrown');
        });

        it('does not throw if version doesn\'t exist, but zip is true', function () {
            const result = checkCustomVersion('3.0.0', ['1.0.0', '2.0.0', '2.1.0'], null, {zip: true});
            expect(result).to.equal('3.0.0');
        });

        it('throws if v1 flag specified with v2 custom version, and zip is false', function () {
            try {
                checkCustomVersion('2', ['1.0.0', '1.0.1', '1.0.2', '2.0.0'], null, {v1: true, zip: false});
            } catch (error) {
                expect(error).to.be.an.instanceof(CliError);
                expect(error.message).to.contain('v2 or greater');
                return;
            }

            expect.fail('expected an error to be thrown');
        });

        it('ignores v1 flag if zip is true', function () {
            const result = checkCustomVersion('2', ['1.0.0', '1.0.1', '1.0.2', '2.0.0'], null, {v1: true, zip: true});
            expect(result).to.equal('2.0.0');
        });

        it('throws if custom version is less than active version', function () {
            try {
                checkCustomVersion('2.0.0', ['1.0.0', '2.0.0', '2.1.0'], '2.1.0');
            } catch (error) {
                expect(error).to.be.an.instanceof(CliError);
                expect(error.message).to.contain('less than the current active version');
                return;
            }

            expect.fail('expected an error to be thrown');
        });

        it('returns normalized version if it passes all other checks', function () {
            const result = checkCustomVersion('2.1', ['1.0.0', '2.0.0', '2.1.0']);
            expect(result).to.equal('2.1.0');
        });
    });

    describe('checkActiveVersion', function () {
        it('throws if --v1 is passed and active version is >= 2.0', function () {
            try {
                checkActiveVersion('2.0.0', '2.1.0', '1.0.0', {v1: true});
            } catch (error) {
                expect(error).to.be.an.instanceof(CliError);
                expect(error.message).to.contain('v2 or greater');
                return;
            }

            expect.fail('expected an error to be thrown');
        });

        it('returns null if --force is not passed and active === latest', function () {
            const result = checkActiveVersion('2.1.0', '2.1.0');
            expect(result).to.be.null;
        });

        it('throws if upgrading major versions from v1', function () {
            try {
                checkActiveVersion('1.0.0', '3.0.0');
            } catch (error) {
                expect(error).to.be.an.instanceof(CliError);
                expect(error.message).to.contain('not on the latest Ghost 1.0');
                return;
            }

            expect.fail('expected an error to be thrown');
        });

        it('allows upgrading from v1 if on latest v1', function () {
            const result = checkActiveVersion('1.0.0', '2.0.0', '1.0.0');
            expect(result).to.equal('2.0.0');
        });

        it('returns version if active === latest and --force is supplied', function () {
            const result = checkActiveVersion('3.0.0', '3.0.0', '1.0.0', {force: true});
            expect(result).to.equal('3.0.0');
        });

        it('returns latest if checks pass', function () {
            const result = checkActiveVersion('2.0.0', '3.0.0');
            expect(result).to.equal('3.0.0');
        });
    });

    describe('resolveVersion', function () {
        let loadVersions = null;

        beforeEach(() => {
            loadVersions = sinon.stub(versionUtils, 'loadVersions');
        });

        afterEach(() => {
            sinon.restore();
        });

        it('returns null if no versions found', async function () {
            loadVersions.resolves({all: []});
            const result = await resolveVersion();

            expect(result).to.be.null;
        });

        it('returns latest v1 if --v1 and no custom/active version', async function () {
            loadVersions.resolves({
                latest: '2.0.0',
                latestMajor: {
                    v1: '1.0.0',
                    v2: '2.0.0'
                },
                all: ['2.0.0', '1.0.0']
            });

            const result = await resolveVersion(null, null, {v1: true});
            expect(result).to.equal('1.0.0');
        });

        it('returns latest if no custom/active version', async function () {
            loadVersions.resolves({
                latest: '2.0.0',
                latestMajor: {
                    v1: '1.0.0',
                    v2: '2.0.0'
                },
                all: ['2.0.0', '1.0.0']
            });

            const result = await resolveVersion();
            expect(result).to.equal('2.0.0');
        });

        it('returns custom version if valid & no active version', async function () {
            loadVersions.resolves({
                latest: '2.2.0',
                latestMajor: {
                    v1: '1.0.0',
                    v2: '2.2.0'
                },
                all: ['2.2.0', '2.1.0', '2.0.0', '1.0.0']
            });

            const result = await resolveVersion('2.0.0');
            expect(result).to.equal('2.0.0');
        });

        it('returns latest v1 version if only 1 is specified', async function () {
            loadVersions.resolves({
                latest: '2.2.0',
                latestMajor: {
                    v1: '1.1.0',
                    v2: '2.2.0'
                },
                all: ['2.2.0', '2.1.0', '2.0.0', '1.1.0', '1.0.0']
            });

            const result = await resolveVersion('1');
            expect(result).to.equal('1.1.0');
        });

        it('returns latest v2 version if only v2 is specified', async function () {
            loadVersions.resolves({
                latest: '2.2.0',
                latestMajor: {
                    v1: '1.1.0',
                    v2: '2.2.0'
                },
                all: ['2.2.0', '2.1.0', '2.0.0', '1.1.0', '1.0.0']
            });

            const result = await resolveVersion('v2');
            expect(result).to.equal('2.2.0');
        });

        it('returns latest version if active version and no custom version', async function () {
            loadVersions.resolves({
                latest: '2.2.0',
                latestMajor: {
                    v1: '1.0.0',
                    v2: '2.2.0'
                },
                all: ['2.2.0', '2.1.0', '2.0.0', '1.0.0']
            });

            const result = await resolveVersion(null, '2.0.0');
            expect(result).to.equal('2.2.0');
        });

        it('returns custom version if active version and custom version', async function () {
            loadVersions.resolves({
                latest: '2.2.0',
                latestMajor: {
                    v1: '1.0.0',
                    v2: '2.2.0'
                },
                all: ['2.2.0', '2.1.0', '2.0.0', '1.0.0']
            });

            const result = await resolveVersion('2.1.0', '2.0.0');
            expect(result).to.equal('2.1.0');
        });
    });

    describe('versionFromZip', function () {
        const currentNodeVersion = process.versions.node;

        before(function () {
            Object.defineProperty(process.versions, 'node', {
                value: '8.11.0', // CHANGE THIS WHENEVER RECOMMENDED NODE VERSION CHANGES
                writable: true,
                enumerable: true,
                configurable: true
            });
        });

        beforeEach(function () {
            delete process.env.GHOST_NODE_VERSION_CHECK;
        });

        after(function () {
            Object.defineProperty(process.versions, 'node', {
                value: currentNodeVersion,
                writeable: false,
                enumerable: true,
                configurable: true
            });
        });

        it('rejects if zip file doesn\'t exist', async function () {
            const existsStub = sinon.stub().returns(false);
            const {versionFromZip} = proxyquire(modulePath, {
                fs: {existsSync: existsStub}
            });

            try {
                await versionFromZip('/some/zip/file.zip');
                expect(false, 'error should have been thrown').to.be.true;
            } catch (error) {
                expect(error).to.be.an.instanceof(SystemError);
                expect(error.message).to.equal('Zip file could not be found.');
                expect(existsStub.calledOnce).to.be.true;
                expect(existsStub.calledWithExactly('/some/zip/file.zip')).to.be.true;
            }
        });

        it('rejects if zip file doesn\'t have a .zip extension', async function () {
            const existsStub = sinon.stub().returns(true);
            const {versionFromZip} = proxyquire(modulePath, {
                fs: {existsSync: existsStub}
            });

            try {
                await versionFromZip('./some/non/zip/file.txt');
                expect(false, 'error should have been thrown').to.be.true;
            } catch (error) {
                expect(error).to.be.an.instanceof(SystemError);
                expect(error.message).to.equal('Zip file could not be found.');
                expect(existsStub.calledOnce).to.be.true;
                expect(existsStub.calledWithExactly(path.join(process.cwd(), './some/non/zip/file.txt'))).to.be.true;
            }
        });

        it('rejects if zip does not have a valid package.json', async function () {
            try {
                await versionFromZip(path.join(__dirname, '../../fixtures/nopkg.zip'));
                expect(false, 'error should have been thrown').to.be.true;
            } catch (error) {
                expect(error).to.be.an.instanceof(SystemError);
                expect(error.message).to.equal('Zip file does not contain a valid package.json.');
            }
        });

        it('rejects if package.json in zip is not for ghost', async function () {
            try {
                await versionFromZip(path.join(__dirname, '../../fixtures/notghost.zip'));
                expect(false, 'error should have been thrown').to.be.true;
            } catch (error) {
                expect(error).to.be.an.instanceof(SystemError);
                expect(error.message).to.equal('Zip file does not contain a Ghost release.');
            }
        });

        it('rejects if ghost version in zip is < 1.0', async function () {
            try {
                await versionFromZip(path.join(__dirname, '../../fixtures/ghostlts.zip'));
                expect(false, 'error should have been thrown').to.be.true;
            } catch (error) {
                expect(error).to.be.an.instanceof(SystemError);
                expect(error.message).to.equal('Zip file contains pre-1.0 version of Ghost.');
            }
        });

        it('rejects if node version isn\'t compatible with ghost node version range and GHOST_NODE_VERSION_CHECK isn\'t set', async function () {
            try {
                await versionFromZip(path.join(__dirname, '../../fixtures/ghost-invalid-node.zip'));
                expect(false, 'error should have been thrown').to.be.true;
            } catch (error) {
                expect(error).to.be.an.instanceof(SystemError);
                expect(error.message).to.equal('Zip file contains a Ghost version incompatible with the current Node version.');
            }
        });

        it('resolves if node version isn\'t compatible with ghost node version range and GHOST_NODE_VERSION_CHECK is set', async function () {
            this.timeout(5000);
            this.slow(2000);

            process.env.GHOST_NODE_VERSION_CHECK = 'false';

            const version = await versionFromZip(path.join(__dirname, '../../fixtures/ghost-invalid-node.zip'));
            expect(version).to.equal('1.0.0');
        });

        it('rejects if a CLI version is specified in package.json and is not compatible with the current CLI version', async function () {
            try {
                await versionFromZip(path.join(__dirname, '../../fixtures/ghost-invalid-cli.zip'));
                expect(false, 'error should have been thrown').to.be.true;
            } catch (error) {
                expect(error).to.be.an.instanceof(SystemError);
                expect(error.message).to.equal('Zip file contains a Ghost version incompatible with this version of the CLI.');
                expect(error.options.help).to.match(/Required: v\^0\.0\.1, current: v/);
                expect(error.options.suggestion).to.equal('npm install -g ghost-cli@latest');
            }
        });

        it('rejects if update version passed and zip version < update version', async function () {
            this.timeout(5000);
            this.slow(2000);

            try {
                await versionFromZip(path.join(__dirname, '../../fixtures/ghostold.zip'), '1.5.0', {force: true});
                expect(false, 'error should have been thrown').to.be.true;
            } catch (error) {
                expect(error).to.be.an.instanceof(CliError);
                expect(error.message)
                    .to.equal('Version in zip file: 1.0.0, is less than the current active version: 1.5.0');
            }
        });

        it('resolves with version of ghost in zip file', async function () {
            this.timeout(5000);
            this.slow(2000);

            const version = await versionFromZip(path.join(__dirname, '../../fixtures/ghostrelease.zip'));
            expect(version).to.equal('1.5.0');
        });
    });
});
