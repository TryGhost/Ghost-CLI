const {expect} = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const Promise = require('bluebird');
const path = require('path');

const modulePath = '../../../lib/commands/install';
const errors = require('../../../lib/errors');

describe('Unit: Commands > Install', function () {
    it('configureOptions adds setup & doctor options', function () {
        const superStub = sinon.stub().returnsArg(1);
        const setupStub = sinon.stub().returnsArg(1);

        // Needed for extension
        class Command {}
        Command.configureOptions = superStub;

        const InstallCommand = proxyquire(modulePath, {
            './setup': {configureOptions: setupStub},
            '../command': Command
        });

        const result = InstallCommand.configureOptions('install', {yargs: true}, [{extensiona: true}]);
        expect(result).to.deep.equal({yargs: true});
        expect(superStub.calledOnce).to.be.true;
        expect(superStub.calledWithExactly('install', {yargs: true}, [{extensiona: true}])).to.be.true;
        expect(setupStub.calledOnce).to.be.true;
        expect(setupStub.calledWithExactly('setup', {yargs: true}, [{extensiona: true}], true)).to.be.true;
    });

    describe('run', function () {
        afterEach(() => {
            sinon.restore();
        });

        it('rejects if directory is not empty', function () {
            const dirEmptyStub = sinon.stub().returns(false);

            const InstallCommand = proxyquire(modulePath, {
                '../utils/dir-is-empty': dirEmptyStub
            });
            const testInstance = new InstallCommand({}, {});

            return testInstance.run({version: '1.0.0', 'check-empty': true}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.SystemError);
                expect(error.message).to.match(/Current directory is not empty/);
                expect(dirEmptyStub.calledOnce).to.be.true;
            });
        });

        it('calls install checks first', function () {
            const dirEmptyStub = sinon.stub().returns(true);
            const listrStub = sinon.stub().rejects();

            const InstallCommand = proxyquire(modulePath, {
                '../utils/dir-is-empty': dirEmptyStub,
                './doctor': {doctorCommand: true}
            });
            const testInstance = new InstallCommand({listr: listrStub}, {});
            const runCommandStub = sinon.stub(testInstance, 'runCommand').resolves();

            return testInstance.run({argv: true}).then(() => {
                expect(false, 'run should have rejected').to.be.true;
            }).catch(() => {
                expect(dirEmptyStub.calledOnce).to.be.true;
                expect(runCommandStub.calledOnce).to.be.true;
                expect(runCommandStub.calledWithExactly(
                    {doctorCommand: true},
                    {categories: ['install'], skipInstanceCheck: true, quiet: true, argv: true, local: false}
                )).to.be.true;
                expect(listrStub.calledOnce).to.be.true;
            });
        });

        it('runs local install when command is `ghost install local`', function () {
            const dirEmptyStub = sinon.stub().returns(true);
            const listrStub = sinon.stub();
            listrStub.onFirstCall().resolves();
            listrStub.onSecondCall().rejects();
            const setEnvironmentStub = sinon.stub();

            const InstallCommand = proxyquire(modulePath, {
                '../utils/dir-is-empty': dirEmptyStub
            });
            const testInstance = new InstallCommand({listr: listrStub}, {cliVersion: '1.0.0', setEnvironment: setEnvironmentStub});
            const runCommandStub = sinon.stub(testInstance, 'runCommand').resolves();

            return testInstance.run({version: 'local', zip: '', v1: true, 'check-empty': true}).then(() => {
                expect(false, 'run should have rejected').to.be.true;
            }).catch(() => {
                expect(dirEmptyStub.calledOnce).to.be.true;
                expect(runCommandStub.calledOnce).to.be.true;
                expect(listrStub.calledOnce).to.be.true;
                expect(listrStub.args[0][1]).to.deep.equal({
                    argv: {version: null, zip: '', v1: true, 'check-empty': true},
                    cliVersion: '1.0.0'
                });
                expect(setEnvironmentStub.calledOnce).to.be.true;
                expect(setEnvironmentStub.calledWithExactly(true, true)).to.be.true;
            });
        });

        it('runs local install when command is `ghost install <version> --local`', function () {
            const dirEmptyStub = sinon.stub().returns(true);
            const listrStub = sinon.stub();
            listrStub.onFirstCall().resolves();
            listrStub.onSecondCall().rejects();
            const setEnvironmentStub = sinon.stub();

            const InstallCommand = proxyquire(modulePath, {
                '../utils/dir-is-empty': dirEmptyStub
            });
            const testInstance = new InstallCommand({listr: listrStub}, {cliVersion: '1.0.0', setEnvironment: setEnvironmentStub});
            const runCommandStub = sinon.stub(testInstance, 'runCommand').resolves();

            return testInstance.run({version: '1.5.0', local: true, zip: '', v1: false, 'check-empty': true}).then(() => {
                expect(false, 'run should have rejected').to.be.true;
            }).catch(() => {
                expect(dirEmptyStub.calledOnce).to.be.true;
                expect(runCommandStub.calledOnce).to.be.true;
                expect(listrStub.calledOnce).to.be.true;
                expect(listrStub.args[0][1]).to.deep.equal({
                    argv: {version: '1.5.0', zip: '', v1: false, local: true, 'check-empty': true},
                    cliVersion: '1.0.0'
                });
                expect(setEnvironmentStub.calledOnce).to.be.true;
                expect(setEnvironmentStub.calledWithExactly(true, true)).to.be.true;
            });
        });

        it('runs local install when command is `ghost install <version> local`', function () {
            const dirEmptyStub = sinon.stub().returns(true);
            const listrStub = sinon.stub();
            listrStub.onFirstCall().resolves();
            listrStub.onSecondCall().rejects();
            const setEnvironmentStub = sinon.stub();

            const InstallCommand = proxyquire(modulePath, {
                '../utils/dir-is-empty': dirEmptyStub
            });
            const testInstance = new InstallCommand({listr: listrStub}, {cliVersion: '1.0.0', setEnvironment: setEnvironmentStub});
            const runCommandStub = sinon.stub(testInstance, 'runCommand').resolves();

            return testInstance.run({version: '1.5.0', zip: '', v1: false, _: ['install', 'local'], 'check-empty': true}).then(() => {
                expect(false, 'run should have rejected').to.be.true;
            }).catch(() => {
                expect(dirEmptyStub.calledOnce).to.be.true;
                expect(runCommandStub.calledOnce).to.be.true;
                expect(listrStub.calledOnce).to.be.true;
                expect(listrStub.args[0][1]).to.deep.equal({
                    argv: {version: '1.5.0', zip: '', v1: false, _: ['install', 'local'], 'check-empty': true},
                    cliVersion: '1.0.0'
                });
                expect(setEnvironmentStub.calledOnce).to.be.true;
                expect(setEnvironmentStub.calledWithExactly(true, true)).to.be.true;
            });
        });

        it('normalizes version to a string', function () {
            const dirEmptyStub = sinon.stub().returns(true);
            const listrStub = sinon.stub();
            listrStub.onFirstCall().resolves();
            listrStub.onSecondCall().rejects();
            const setEnvironmentStub = sinon.stub();

            const InstallCommand = proxyquire(modulePath, {
                '../utils/dir-is-empty': dirEmptyStub
            });
            const testInstance = new InstallCommand({listr: listrStub}, {cliVersion: '1.0.0', setEnvironment: setEnvironmentStub});
            const runCommandStub = sinon.stub(testInstance, 'runCommand').resolves();

            return testInstance.run({version: 2, zip: '', v1: false, _: ['install', 'local'], 'check-empty': true}).then(() => {
                expect(false, 'run should have rejected').to.be.true;
            }).catch(() => {
                expect(dirEmptyStub.calledOnce).to.be.true;
                expect(runCommandStub.calledOnce).to.be.true;
                expect(listrStub.calledOnce).to.be.true;
                expect(listrStub.args[0][1]).to.deep.equal({
                    argv: {version: '2', zip: '', v1: false, _: ['install', 'local'], 'check-empty': true},
                    cliVersion: '1.0.0'
                });
                expect(setEnvironmentStub.calledOnce).to.be.true;
                expect(setEnvironmentStub.calledWithExactly(true, true)).to.be.true;
            });
        });

        it('calls all tasks and returns after tasks run if --no-setup is passed', function () {
            const dirEmptyStub = sinon.stub().returns(true);
            const yarnInstallStub = sinon.stub().resolves();
            const ensureStructureStub = sinon.stub().resolves();
            const listrStub = sinon.stub().callsFake((tasks, ctx) => Promise.each(tasks, task => task.task(ctx, {})));

            const InstallCommand = proxyquire(modulePath, {
                '../tasks/yarn-install': yarnInstallStub,
                '../tasks/ensure-structure': ensureStructureStub,
                '../utils/dir-is-empty': dirEmptyStub
            });
            const testInstance = new InstallCommand({listr: listrStub}, {cliVersion: '1.0.0'});
            const runCommandStub = sinon.stub(testInstance, 'runCommand').resolves();
            const versionStub = sinon.stub(testInstance, 'version').resolves();
            const linkStub = sinon.stub(testInstance, 'link').resolves();
            const casperStub = sinon.stub(testInstance, 'casper').resolves();

            return testInstance.run({version: '1.0.0', setup: false, 'check-empty': true}).then(() => {
                expect(dirEmptyStub.calledOnce).to.be.true;
                expect(listrStub.calledTwice).to.be.true;
                expect(yarnInstallStub.calledOnce).to.be.true;
                expect(ensureStructureStub.calledOnce).to.be.true;
                expect(versionStub.calledOnce).to.be.true;
                expect(linkStub.calledOnce).to.be.true;
                expect(casperStub.calledOnce).to.be.true;
                expect(runCommandStub.calledOnce).to.be.true;
            });
        });

        it('sets local and runs setup command if setup is true', function () {
            const dirEmptyStub = sinon.stub().returns(true);
            const listrStub = sinon.stub().resolves();
            const setEnvironmentStub = sinon.stub();

            const InstallCommand = proxyquire(modulePath, {
                '../utils/dir-is-empty': dirEmptyStub,
                './setup': {SetupCommand: true}
            });
            const testInstance = new InstallCommand({listr: listrStub}, {cliVersion: '1.0.0', setEnvironment: setEnvironmentStub});
            const runCommandStub = sinon.stub(testInstance, 'runCommand').resolves();

            return testInstance.run({version: 'local', setup: true, zip: '', 'check-empty': true}).then(() => {
                expect(dirEmptyStub.calledOnce).to.be.true;
                expect(listrStub.calledOnce).to.be.true;
                expect(setEnvironmentStub.calledOnce).to.be.true;
                expect(setEnvironmentStub.calledWithExactly(true, true));
                expect(runCommandStub.calledTwice).to.be.true;
                expect(runCommandStub.calledWithExactly(
                    {SetupCommand: true},
                    {version: 'local', local: true, zip: '', 'check-empty': true}
                ));
            });
        });

        it('allows running in non-empty directory if --no-check-empty is passed', function () {
            const dirEmptyStub = sinon.stub().returns(false);
            const listrStub = sinon.stub().resolves();
            const setEnvironmentStub = sinon.stub();

            const InstallCommand = proxyquire(modulePath, {
                '../utils/dir-is-empty': dirEmptyStub,
                './setup': {SetupCommand: true}
            });
            const testInstance = new InstallCommand({listr: listrStub}, {cliVersion: '1.0.0', setEnvironment: setEnvironmentStub});
            const runCommandStub = sinon.stub(testInstance, 'runCommand').resolves();

            return testInstance.run({version: 'local', setup: true, zip: '', 'check-empty': false}).then(() => {
                expect(dirEmptyStub.calledOnce).to.be.true;
                expect(listrStub.calledOnce).to.be.true;
                expect(setEnvironmentStub.calledOnce).to.be.true;
                expect(setEnvironmentStub.calledWithExactly(true, true));
                expect(runCommandStub.calledTwice).to.be.true;
                expect(runCommandStub.calledWithExactly(
                    {SetupCommand: true},
                    {version: 'local', local: true, zip: '', 'check-empty': false}
                ));
            });
        });
    });

    describe('tasks > version', function () {
        it('calls resolveVersion, sets version and install path', async function () {
            const resolveVersion = sinon.stub().resolves('1.5.0');
            const InstallCommand = proxyquire(modulePath, {
                '../utils/version': {resolveVersion}
            });

            const testInstance = new InstallCommand({}, {});
            const context = {argv: {version: '1.0.0', v1: false}};

            await testInstance.version(context);
            expect(resolveVersion.calledOnce).to.be.true;
            expect(resolveVersion.calledWithExactly('1.0.0', null, {v1: false})).to.be.true;
            expect(context.version).to.equal('1.5.0');
            expect(context.installPath).to.equal(path.join(process.cwd(), 'versions/1.5.0'));
        });

        it('calls versionFromZip if zip file is passed in context', async function () {
            const resolveVersion = sinon.stub().resolves('1.5.0');
            const versionFromZip = sinon.stub().resolves('1.5.2');
            const InstallCommand = proxyquire(modulePath, {
                '../utils/version': {resolveVersion, versionFromZip}
            });
            const log = sinon.stub();

            const testInstance = new InstallCommand({}, {});
            const context = {argv: {zip: '/some/zip/file.zip'}, ui: {log}};

            await testInstance.version(context);
            expect(resolveVersion.called).to.be.false;
            expect(versionFromZip.calledOnce).to.be.true;
            expect(versionFromZip.calledWith('/some/zip/file.zip')).to.be.true;
            expect(context.version).to.equal('1.5.2');
            expect(context.installPath).to.equal(path.join(process.cwd(), 'versions/1.5.2'));
            expect(log.called).to.be.false;
        });

        it('logs if both version and zip are passed', async function () {
            const resolveVersion = sinon.stub().resolves('1.5.0');
            const versionFromZip = sinon.stub().resolves('1.5.2');
            const InstallCommand = proxyquire(modulePath, {
                '../utils/version': {resolveVersion, versionFromZip}
            });
            const log = sinon.stub();

            const testInstance = new InstallCommand({}, {});
            const context = {argv: {version: '1.0.0', zip: '/some/zip/file.zip'}, ui: {log}};

            await testInstance.version(context);
            expect(resolveVersion.called).to.be.false;
            expect(versionFromZip.calledOnce).to.be.true;
            expect(versionFromZip.calledWith('/some/zip/file.zip')).to.be.true;
            expect(context.version).to.equal('1.5.2');
            expect(context.installPath).to.equal(path.join(process.cwd(), 'versions/1.5.2'));
            expect(log.calledOnce).to.be.true;
        });

        it('handles v0.x export case', async function () {
            const resolveVersion = sinon.stub().resolves('1.5.0');
            const parseExport = sinon.stub().returns({version: '0.11.14'});
            const InstallCommand = proxyquire(modulePath, {
                '../utils/version': {resolveVersion},
                '../tasks/import': {parseExport}
            });
            const log = sinon.stub();

            const testInstance = new InstallCommand({}, {});
            const context = {argv: {version: '2.0.0', fromExport: 'test-export.json'}, ui: {log}};

            await testInstance.version(context);
            expect(resolveVersion.calledOnceWithExactly('v1', null, {v1: undefined})).to.be.true;
            expect(parseExport.calledOnceWithExactly('test-export.json')).to.be.true;
            expect(context.version).to.equal('1.5.0');
            expect(context.installPath).to.equal(path.join(process.cwd(), 'versions/1.5.0'));
            expect(log.calledOnce).to.be.true;
        });

        it('uses export version if none defined', async function () {
            const resolveVersion = sinon.stub().resolves('2.0.0');
            const parseExport = sinon.stub().returns({version: '2.0.0'});
            const InstallCommand = proxyquire(modulePath, {
                '../utils/version': {resolveVersion},
                '../tasks/import': {parseExport}
            });
            const log = sinon.stub();

            const testInstance = new InstallCommand({}, {});
            const context = {argv: {fromExport: 'test-export.json'}, ui: {log}};

            await testInstance.version(context);
            expect(resolveVersion.calledOnceWithExactly('2.0.0', null, {v1: undefined})).to.be.true;
            expect(parseExport.calledOnceWithExactly('test-export.json')).to.be.true;
            expect(context.version).to.equal('2.0.0');
            expect(context.installPath).to.equal(path.join(process.cwd(), 'versions/2.0.0'));
            expect(log.called).to.be.false;
        });

        it('errors if custom version is less than export version', async function () {
            const resolveVersion = sinon.stub().resolves('2.0.0');
            const parseExport = sinon.stub().returns({version: '3.0.0'});
            const InstallCommand = proxyquire(modulePath, {
                '../utils/version': {resolveVersion},
                '../tasks/import': {parseExport}
            });
            const log = sinon.stub();

            const testInstance = new InstallCommand({}, {});
            const context = {argv: {version: 'v2', fromExport: 'test-export.json'}, ui: {log}};

            try {
                await testInstance.version(context);
            } catch (error) {
                expect(error).to.be.an.instanceof(errors.SystemError);
                expect(error.message).to.include('v3.0.0 into v2.0.0');
                expect(resolveVersion.calledOnceWithExactly('v2', null, {v1: undefined})).to.be.true;
                expect(parseExport.calledOnceWithExactly('test-export.json')).to.be.true;
                expect(log.called).to.be.false;
                return;
            }

            expect.fail('version should have errored');
        });
    });

    describe('tasks > casper', function () {
        it('links casper version correctly', function () {
            const symlinkSyncStub = sinon.stub();
            const InstallCommand = proxyquire(modulePath, {
                'symlink-or-copy': {sync: symlinkSyncStub}
            });

            const testInstance = new InstallCommand({}, {});

            testInstance.casper();
            expect(symlinkSyncStub.calledOnce).to.be.true;
            expect(symlinkSyncStub.calledWithExactly(
                path.join(process.cwd(), 'current/content/themes/casper'),
                path.join(process.cwd(), 'content/themes/casper')
            ));
        });
    });

    describe('tasks > link', function () {
        it('creates current link and updates versions', function () {
            const symlinkSyncStub = sinon.stub();
            const config = {};
            const getInstanceStub = sinon.stub().returns(config);

            const InstallCommand = proxyquire(modulePath, {
                'symlink-or-copy': {sync: symlinkSyncStub}
            });

            const testInstance = new InstallCommand({}, {getInstance: getInstanceStub, cliVersion: '1.0.0'});

            testInstance.link({version: '1.5.0', installPath: '/some/dir/1.5.0'});
            expect(symlinkSyncStub.calledOnce).to.be.true;
            expect(symlinkSyncStub.calledWithExactly('/some/dir/1.5.0', path.join(process.cwd(), 'current')));
            expect(getInstanceStub.calledOnce).to.be.true;
            expect(config).to.deep.equal({
                version: '1.5.0',
                cliVersion: '1.0.0'
            });
        });
    });
});
