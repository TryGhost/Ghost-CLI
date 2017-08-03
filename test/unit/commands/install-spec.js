'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const path = require('path');

const modulePath = '../../../lib/commands/install';
const errors = require('../../../lib/errors');

describe('Unit: Commands > Install', function () {
    it('configureOptions adds setup options as well', function () {
        let superStub = sinon.stub().returnsArg(1);
        let setupStub = sinon.stub().returnsArg(1);

        // Needed for extension
        class Command {}
        Command.configureOptions = superStub;

        const InstallCommand = proxyquire(modulePath, {
            './setup': {configureOptions: setupStub},
            '../command': Command
        });

        let result = InstallCommand.configureOptions('install', { yargs: true }, [{extensiona: true}]);
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
            let chdirStub = sandbox.stub(process, 'chdir').throws();
            let ensureDirStub = sandbox.stub();

            const InstallCommand = proxyquire(modulePath, {
                'fs-extra': {ensureDirSync: ensureDirStub}
            });
            let testInstance = new InstallCommand({}, {});

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
            let readdirStub = sandbox.stub().returns([
                '.ghost-cli',
                'README.md'
            ]);

            const InstallCommand = proxyquire(modulePath, {
                'fs-extra': {readdirSync: readdirStub}
            });
            let testInstance = new InstallCommand({}, {});

            return testInstance.run({version: '1.0.0'}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.SystemError);
                expect(error.message).to.match(/Current directory is not empty/);
                expect(readdirStub.calledOnce).to.be.true;
            });
        });

        it('calls install checks first', function () {
            let readdirStub = sandbox.stub().returns(['ghost-cli-debug-1234.log']);
            let listrStub = sandbox.stub().rejects();

            const InstallCommand = proxyquire(modulePath, {
                'fs-extra': {readdirSync: readdirStub},
                './doctor/checks/install': [{check1: true}, {check2: true}]
            });
            let testInstance = new InstallCommand({listr: listrStub}, {});

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
            let readdirStub = sandbox.stub().returns([]);
            let listrStub = sandbox.stub();
            listrStub.onFirstCall().resolves();
            listrStub.onSecondCall().rejects();
            let setEnvironmentStub = sandbox.stub();

            const InstallCommand = proxyquire(modulePath, {
                'fs-extra': {readdirSync: readdirStub},
                './doctor/checks/install': [{check1: true}, {check2: true}]
            });
            let testInstance = new InstallCommand({listr: listrStub}, {cliVersion: '1.0.0', setEnvironment: setEnvironmentStub});

            return testInstance.run({version: 'local'}).then(() => {
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
                    argv: {version: 'local'},
                    local: true
                });
                expect(listrStub.args[1][1]).to.deep.equal({
                    version: null,
                    cliVersion: '1.0.0'
                });
                expect(setEnvironmentStub.calledOnce).to.be.true;
                expect(setEnvironmentStub.calledWithExactly(true, true)).to.be.true;
            });
        });

        it('runs local install when command is `ghost install <version> --local`', function () {
            let readdirStub = sandbox.stub().returns([]);
            let listrStub = sandbox.stub();
            listrStub.onFirstCall().resolves();
            listrStub.onSecondCall().rejects();
            let setEnvironmentStub = sandbox.stub();

            const InstallCommand = proxyquire(modulePath, {
                'fs-extra': {readdirSync: readdirStub},
                './doctor/checks/install': [{check1: true}, {check2: true}]
            });
            let testInstance = new InstallCommand({listr: listrStub}, {cliVersion: '1.0.0', setEnvironment: setEnvironmentStub});

            return testInstance.run({version: '1.5.0', local: true}).then(() => {
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
                    argv: {version: '1.5.0', local: true},
                    local: true
                });
                expect(listrStub.args[1][1]).to.deep.equal({
                    version: '1.5.0',
                    cliVersion: '1.0.0'
                });
                expect(setEnvironmentStub.calledOnce).to.be.true;
                expect(setEnvironmentStub.calledWithExactly(true, true)).to.be.true;
            });
        });

        it('returns after tasks run if --no-setup is passed', function () {
            let readdirStub = sandbox.stub().returns([]);
            let listrStub = sandbox.stub().resolves();

            const InstallCommand = proxyquire(modulePath, {
                'fs-extra': {readdirSync: readdirStub}
            });
            let testInstance = new InstallCommand({listr: listrStub}, {cliVersion: '1.0.0'});
            let runCommandStub = sandbox.stub(testInstance, 'runCommand').resolves();

            return testInstance.run({version: '1.0.0', setup: false}).then(() => {
                expect(readdirStub.calledOnce).to.be.true;
                expect(listrStub.calledTwice).to.be.true;
                expect(runCommandStub.called).to.be.false;
            });
        });

        it('sets local and runs setup command if setup is true', function () {
            let readdirStub = sandbox.stub().returns([]);
            let listrStub = sandbox.stub().resolves();
            let setEnvironmentStub = sandbox.stub();

            const InstallCommand = proxyquire(modulePath, {
                'fs-extra': {readdirSync: readdirStub},
                './setup': {SetupCommand: true}
            });
            let testInstance = new InstallCommand({listr: listrStub}, {cliVersion: '1.0.0', setEnvironment: setEnvironmentStub});
            let runCommandStub = sandbox.stub(testInstance, 'runCommand').resolves();

            return testInstance.run({version: 'local', setup: true}).then(() => {
                expect(readdirStub.calledOnce).to.be.true;
                expect(listrStub.calledTwice).to.be.true;
                expect(setEnvironmentStub.calledOnce).to.be.true;
                expect(setEnvironmentStub.calledWithExactly(true, true));
                expect(runCommandStub.calledOnce).to.be.true;
                expect(runCommandStub.calledWithExactly(
                    {SetupCommand: true},
                    {version: 'local', local: true}
                ));
            });
        });
    });

    describe('tasks > version', function () {
        it('calls resolveVersion, sets version and install path', function () {
            let resolveVersionStub = sinon.stub().resolves('1.5.0');
            const InstallCommand = proxyquire(modulePath, {
                '../utils/resolve-version': resolveVersionStub
            });

            let testInstance = new InstallCommand({}, {});
            let context = {version: '1.0.0'};

            return testInstance.version(context).then(() => {
                expect(resolveVersionStub.calledOnce).to.be.true;
                expect(context.version).to.equal('1.5.0');
                expect(context.installPath).to.equal(path.join(process.cwd(), 'versions/1.5.0'));
            });
        });
    });

    describe('tasks > casper', function () {
        it('links casper version correctly', function () {
            let symlinkSyncStub = sinon.stub();
            const InstallCommand = proxyquire(modulePath, {
                'symlink-or-copy': {sync: symlinkSyncStub}
            });

            let testInstance = new InstallCommand({}, {});

            testInstance.casper();
            expect(symlinkSyncStub.calledOnce).to.be.true;
            expect(symlinkSyncStub.calledWithExactly(
                path.join(process.cwd(), 'current/content/themes/casper'),
                path.join(process.cwd(), 'content/themes/casper')
            ));
        });
    });

    describe('tasks > link', function () {
        it('creates current link and updates cliConfig', function () {
            let symlinkSyncStub = sinon.stub();
            let config = {
                set: sinon.stub(),
                save: sinon.stub()
            };
            config.set.returns(config);
            let getInstanceStub = sinon.stub().returns({cliConfig: config});

            const InstallCommand = proxyquire(modulePath, {
                'symlink-or-copy': {sync: symlinkSyncStub}
            });

            let testInstance = new InstallCommand({}, {getInstance: getInstanceStub, cliVersion: '1.0.0'});

            testInstance.link({version: '1.5.0', installPath: '/some/dir/1.5.0'});
            expect(symlinkSyncStub.calledOnce).to.be.true;
            expect(symlinkSyncStub.calledWithExactly('/some/dir/1.5.0', path.join(process.cwd(), 'current')));
            expect(getInstanceStub.calledOnce).to.be.true;
            expect(config.set.calledTwice).to.be.true;
            expect(config.set.calledWithExactly('cli-version', '1.0.0')).to.be.true;
            expect(config.set.calledWithExactly('active-version', '1.5.0')).to.be.true;
            expect(config.save.calledOnce).to.be.true;
        });
    });
});
