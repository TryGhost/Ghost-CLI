'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const Promise = require('bluebird');
const path = require('path');

const modulePath = '../../../lib/commands/backup';
const errors = require('../../../lib/errors');

describe('Unit: Commands > Backup', function () {
    it('configureOptions adds setup options as well', function () {
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
        const sandbox = sinon.sandbox.create();

        afterEach(() => {
            sandbox.restore();
        })

        it('creates dir and changes into it if --dir option is passed', function () {
            const chdirStub = sandbox.stub(process, 'chdir').throws();
            const ensureDirStub = sandbox.stub();

            const InstallCommand = proxyquire(modulePath, {
                'fs-extra': {ensureDirSync: ensureDirStub}
            });
            const testInstance = new InstallCommand({}, {});

            try {
                testInstance.run({dir: '/some/dir'});
            } catch (e) {
                // ignore error, chdir is supposed to throw the error
                expect(ensureDirStub.calledOnce).to.be.true;
                expect(ensureDirStub.calledWithExactly('/some/dir')).to.be.true;
                expect(chdirStub.calledOnce).to.be.true;
                expect(chdirStub.calledWithExactly('/some/dir')).to.be.true;
            }
        });

        it('rejects if directory is not empty', function () {
            const readdirStub = sandbox.stub().returns([
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
            const readdirStub = sandbox.stub().returns(['ghost-cli-debug-1234.log']);
            const listrStub = sandbox.stub().rejects();

            const InstallCommand = proxyquire(modulePath, {
                'fs-extra': {readdirSync: readdirStub},
                './doctor/checks/install': [{check1: true}, {check2: true}]
            });
            const testInstance = new InstallCommand({listr: listrStub}, {});

            return testInstance.run({argv: true}).then(() => {
                expect(false, 'run should have rejected').to.be.true;
            }).catch(() => {
                expect(readdirStub.calledOnce).to.be.true;
                expect(listrStub.calledOnce).to.be.true;
                expect(listrStub.args[0][0]).to.deep.equal([
                    {check1: true},
                    {check2: true}
                ]);
                expect(listrStub.args[0][1]).to.deep.equal({
                    ui: {listr: listrStub},
                    argv: {argv: true},
                    local: false
                });
            });
        });

        it('runs local install when command is `ghost install local`', function () {
            const readdirStub = sandbox.stub().returns([]);
            const listrStub = sandbox.stub();
            listrStub.onFirstCall().resolves();
            listrStub.onSecondCall().rejects();
            const setEnvironmentStub = sandbox.stub();

            const InstallCommand = proxyquire(modulePath, {
                'fs-extra': {readdirSync: readdirStub},
                './doctor/checks/install': [{check1: true}, {check2: true}]
            });
            const testInstance = new InstallCommand({listr: listrStub}, {cliVersion: '1.0.0', setEnvironment: setEnvironmentStub});

            return testInstance.run({version: 'local', zip: ''}).then(() => {
                expect(false, 'run should have rejected').to.be.true;
            }).catch(() => {
                expect(readdirStub.calledOnce).to.be.true;
                expect(listrStub.calledTwice).to.be.true;
                expect(listrStub.args[0][0]).to.deep.equal([
                    {check1: true},
                    {check2: true}
                ]);
                expect(listrStub.args[0][1]).to.deep.equal({
                    ui: {listr: listrStub},
                    argv: {version: 'local', zip: ''},
                    local: true
                });
                expect(listrStub.args[1][1]).to.deep.equal({
                    version: null,
                    cliVersion: '1.0.0',
                    zip: ''
                });
                expect(setEnvironmentStub.calledOnce).to.be.true;
                expect(setEnvironmentStub.calledWithExactly(true, true)).to.be.true;
            });
        });

        it('runs local install when command is `ghost install <version> --local`', function () {
            const readdirStub = sandbox.stub().returns([]);
            const listrStub = sandbox.stub();
            listrStub.onFirstCall().resolves();
            listrStub.onSecondCall().rejects();
            const setEnvironmentStub = sandbox.stub();

            const InstallCommand = proxyquire(modulePath, {
                'fs-extra': {readdirSync: readdirStub},
                './doctor/checks/install': [{check1: true}, {check2: true}]
            });
            const testInstance = new InstallCommand({listr: listrStub}, {cliVersion: '1.0.0', setEnvironment: setEnvironmentStub});

            return testInstance.run({version: '1.5.0', local: true, zip: ''}).then(() => {
                expect(false, 'run should have rejected').to.be.true;
            }).catch(() => {
                expect(readdirStub.calledOnce).to.be.true;
                expect(listrStub.calledTwice).to.be.true;
                expect(listrStub.args[0][0]).to.deep.equal([
                    {check1: true},
                    {check2: true}
                ]);
                expect(listrStub.args[0][1]).to.deep.equal({
                    ui: {listr: listrStub},
                    argv: {version: '1.5.0', local: true, zip: ''},
                    local: true
                });
                expect(listrStub.args[1][1]).to.deep.equal({
                    version: '1.5.0',
                    cliVersion: '1.0.0',
                    zip: ''
                });
                expect(setEnvironmentStub.calledOnce).to.be.true;
                expect(setEnvironmentStub.calledWithExactly(true, true)).to.be.true;
            });
        });

        it('calls all tasks and returns after tasks run if --no-setup is passed', function () {
            const readdirStub = sandbox.stub().returns([]);
            const yarnInstallStub = sandbox.stub().resolves();
            const ensureStructureStub = sandbox.stub().resolves();
            const listrStub = sandbox.stub().callsFake((tasks, ctx) => {
                return Promise.each(tasks, task => task.task(ctx, {}));
            });

            const InstallCommand = proxyquire(modulePath, {
                'fs-extra': {readdirSync: readdirStub},
                '../tasks/yarn-install': yarnInstallStub,
                '../tasks/ensure-structure': ensureStructureStub,
                './doctor/checks/install': []
            });
            const testInstance = new InstallCommand({listr: listrStub}, {cliVersion: '1.0.0'});
            const runCommandStub = sandbox.stub(testInstance, 'runCommand').resolves();
            const versionStub = sandbox.stub(testInstance, 'version').resolves();
            const linkStub = sinon.stub(testInstance, 'link').resolves();
            const casperStub = sinon.stub(testInstance, 'casper').resolves();

            return testInstance.run({version: '1.0.0', setup: false}).then(() => {
                expect(readdirStub.calledOnce).to.be.true;
                expect(listrStub.calledThrice).to.be.true;
                expect(yarnInstallStub.calledOnce).to.be.true;
                expect(ensureStructureStub.calledOnce).to.be.true;
                expect(versionStub.calledOnce).to.be.true;
                expect(linkStub.calledOnce).to.be.true;
                expect(casperStub.calledOnce).to.be.true;
                expect(runCommandStub.called).to.be.false;
            });
        });

        it('sets local and runs setup command if setup is true', function () {
            const readdirStub = sandbox.stub().returns([]);
            const listrStub = sandbox.stub().resolves();
            const setEnvironmentStub = sandbox.stub();

            const InstallCommand = proxyquire(modulePath, {
                'fs-extra': {readdirSync: readdirStub},
                './setup': {SetupCommand: true}
            });
            const testInstance = new InstallCommand({listr: listrStub}, {cliVersion: '1.0.0', setEnvironment: setEnvironmentStub});
            const runCommandStub = sandbox.stub(testInstance, 'runCommand').resolves();

            return testInstance.run({version: 'local', setup: true, zip: ''}).then(() => {
                expect(readdirStub.calledOnce).to.be.true;
                expect(listrStub.calledTwice).to.be.true;
                expect(setEnvironmentStub.calledOnce).to.be.true;
                expect(setEnvironmentStub.calledWithExactly(true, true));
                expect(runCommandStub.calledOnce).to.be.true;
                expect(runCommandStub.calledWithExactly(
                    {SetupCommand: true},
                    {version: 'local', local: true, zip: ''}
                ));
            });
        });
    });
});
