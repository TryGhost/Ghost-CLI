'use strict';
const expect = require('chai').expect;
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
        const doctorStub = sinon.stub().returnsArg(1);

        // Needed for extension
        class Command {}
        Command.configureOptions = superStub;

        const InstallCommand = proxyquire(modulePath, {
            './setup': {configureOptions: setupStub},
            './doctor': {configureOptions: doctorStub},
            '../command': Command
        });

        const result = InstallCommand.configureOptions('install', {yargs: true}, [{extensiona: true}]);
        expect(result).to.deep.equal({yargs: true});
        expect(superStub.calledOnce).to.be.true;
        expect(superStub.calledWithExactly('install', {yargs: true}, [{extensiona: true}])).to.be.true;
        expect(setupStub.calledOnce).to.be.true;
        expect(setupStub.calledWithExactly('setup', {yargs: true}, [{extensiona: true}], true)).to.be.true;
        expect(doctorStub.calledOnce).to.be.true;
        expect(doctorStub.calledWithExactly('doctor', {yargs: true}, [{extensiona: true}], true)).to.be.true;
    });

    describe('run', function () {
        afterEach(() => {
            sinon.restore();
        });

        it('rejects if directory is not empty', function () {
            const readdirStub = sinon.stub().returns([
                '.ghost-cli',
                'README.md'
            ]);

            const InstallCommand = proxyquire(modulePath, {
                'fs-extra': {readdirSync: readdirStub}
            });
            const testInstance = new InstallCommand({}, {});

            return testInstance.run({version: '1.0.0'}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.SystemError);
                expect(error.message).to.match(/Current directory is not empty/);
                expect(readdirStub.calledOnce).to.be.true;
            });
        });

        it('calls install checks first', function () {
            const readdirStub = sinon.stub().returns(['ghost-cli-debug-1234.log']);
            const listrStub = sinon.stub().rejects();

            const InstallCommand = proxyquire(modulePath, {
                'fs-extra': {readdirSync: readdirStub},
                './doctor': {doctorCommand: true}
            });
            const testInstance = new InstallCommand({listr: listrStub}, {});
            const runCommandStub = sinon.stub(testInstance, 'runCommand').resolves();

            return testInstance.run({argv: true}).then(() => {
                expect(false, 'run should have rejected').to.be.true;
            }).catch(() => {
                expect(readdirStub.calledOnce).to.be.true;
                expect(runCommandStub.calledOnce).to.be.true;
                expect(runCommandStub.calledWithExactly(
                    {doctorCommand: true},
                    {categories: ['install'], skipInstanceCheck: true, quiet: true, argv: true, local: false}
                )).to.be.true;
                expect(listrStub.calledOnce).to.be.true;
            });
        });

        it('runs local install when command is `ghost install local`', function () {
            const readdirStub = sinon.stub().returns([]);
            const listrStub = sinon.stub();
            listrStub.onFirstCall().resolves();
            listrStub.onSecondCall().rejects();
            const setEnvironmentStub = sinon.stub();

            const InstallCommand = proxyquire(modulePath, {
                'fs-extra': {readdirSync: readdirStub}
            });
            const testInstance = new InstallCommand({listr: listrStub}, {cliVersion: '1.0.0', setEnvironment: setEnvironmentStub});
            const runCommandStub = sinon.stub(testInstance, 'runCommand').resolves();

            return testInstance.run({version: 'local', zip: '', v1: true}).then(() => {
                expect(false, 'run should have rejected').to.be.true;
            }).catch(() => {
                expect(readdirStub.calledOnce).to.be.true;
                expect(runCommandStub.calledOnce).to.be.true;
                expect(listrStub.calledOnce).to.be.true;
                expect(listrStub.args[0][1]).to.deep.equal({
                    version: null,
                    cliVersion: '1.0.0',
                    zip: '',
                    v1: true
                });
                expect(setEnvironmentStub.calledOnce).to.be.true;
                expect(setEnvironmentStub.calledWithExactly(true, true)).to.be.true;
            });
        });

        it('runs local install when command is `ghost install <version> --local`', function () {
            const readdirStub = sinon.stub().returns([]);
            const listrStub = sinon.stub();
            listrStub.onFirstCall().resolves();
            listrStub.onSecondCall().rejects();
            const setEnvironmentStub = sinon.stub();

            const InstallCommand = proxyquire(modulePath, {
                'fs-extra': {readdirSync: readdirStub}
            });
            const testInstance = new InstallCommand({listr: listrStub}, {cliVersion: '1.0.0', setEnvironment: setEnvironmentStub});
            const runCommandStub = sinon.stub(testInstance, 'runCommand').resolves();

            return testInstance.run({version: '1.5.0', local: true, zip: '', v1: false}).then(() => {
                expect(false, 'run should have rejected').to.be.true;
            }).catch(() => {
                expect(readdirStub.calledOnce).to.be.true;
                expect(runCommandStub.calledOnce).to.be.true;
                expect(listrStub.calledOnce).to.be.true;
                expect(listrStub.args[0][1]).to.deep.equal({
                    version: '1.5.0',
                    cliVersion: '1.0.0',
                    zip: '',
                    v1: false
                });
                expect(setEnvironmentStub.calledOnce).to.be.true;
                expect(setEnvironmentStub.calledWithExactly(true, true)).to.be.true;
            });
        });

        it('calls all tasks and returns after tasks run if --no-setup is passed', function () {
            const readdirStub = sinon.stub().returns([]);
            const yarnInstallStub = sinon.stub().resolves();
            const ensureStructureStub = sinon.stub().resolves();
            const listrStub = sinon.stub().callsFake((tasks, ctx) => Promise.each(tasks, task => task.task(ctx, {})));

            const InstallCommand = proxyquire(modulePath, {
                'fs-extra': {readdirSync: readdirStub},
                '../tasks/yarn-install': yarnInstallStub,
                '../tasks/ensure-structure': ensureStructureStub
            });
            const testInstance = new InstallCommand({listr: listrStub}, {cliVersion: '1.0.0'});
            const runCommandStub = sinon.stub(testInstance, 'runCommand').resolves();
            const versionStub = sinon.stub(testInstance, 'version').resolves();
            const linkStub = sinon.stub(testInstance, 'link').resolves();
            const casperStub = sinon.stub(testInstance, 'casper').resolves();

            return testInstance.run({version: '1.0.0', setup: false}).then(() => {
                expect(readdirStub.calledOnce).to.be.true;
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
            const readdirStub = sinon.stub().returns([]);
            const listrStub = sinon.stub().resolves();
            const setEnvironmentStub = sinon.stub();

            const InstallCommand = proxyquire(modulePath, {
                'fs-extra': {readdirSync: readdirStub},
                './setup': {SetupCommand: true}
            });
            const testInstance = new InstallCommand({listr: listrStub}, {cliVersion: '1.0.0', setEnvironment: setEnvironmentStub});
            const runCommandStub = sinon.stub(testInstance, 'runCommand').resolves();

            return testInstance.run({version: 'local', setup: true, zip: ''}).then(() => {
                expect(readdirStub.calledOnce).to.be.true;
                expect(listrStub.calledOnce).to.be.true;
                expect(setEnvironmentStub.calledOnce).to.be.true;
                expect(setEnvironmentStub.calledWithExactly(true, true));
                expect(runCommandStub.calledTwice).to.be.true;
                expect(runCommandStub.calledWithExactly(
                    {SetupCommand: true},
                    {version: 'local', local: true, zip: ''}
                ));
            });
        });
    });

    describe('tasks > version', function () {
        it('calls resolveVersion, sets version and install path', function () {
            const resolveVersionStub = sinon.stub().resolves('1.5.0');
            const InstallCommand = proxyquire(modulePath, {
                '../utils/resolve-version': resolveVersionStub
            });

            const testInstance = new InstallCommand({}, {});
            const context = {version: '1.0.0'};

            return testInstance.version(context).then(() => {
                expect(resolveVersionStub.calledOnce).to.be.true;
                expect(context.version).to.equal('1.5.0');
                expect(context.installPath).to.equal(path.join(process.cwd(), 'versions/1.5.0'));
            });
        });

        it('calls versionFromZip if zip file is passed in context', function () {
            const resolveVersionStub = sinon.stub().resolves('1.5.0');
            const zipVersionStub = sinon.stub().resolves('1.5.2');
            const InstallCommand = proxyquire(modulePath, {
                '../utils/resolve-version': resolveVersionStub,
                '../utils/version-from-zip': zipVersionStub
            });

            const testInstance = new InstallCommand({}, {});
            const context = {version: '1.0.0', zip: '/some/zip/file.zip'};

            return testInstance.version(context).then(() => {
                expect(resolveVersionStub.called).to.be.false;
                expect(zipVersionStub.calledOnce).to.be.true;
                expect(zipVersionStub.calledWith('/some/zip/file.zip')).to.be.true;
                expect(context.version).to.equal('1.5.2');
                expect(context.installPath).to.equal(path.join(process.cwd(), 'versions/1.5.2'));
            });
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
