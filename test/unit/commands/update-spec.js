'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const configStub = require('../../utils/config-stub');
const {setupTestFolder, cleanupTestFolders} = require('../../utils/test-folder');
const Promise = require('bluebird');
const path = require('path');
const fs = require('fs-extra');

const modulePath = '../../../lib/commands/update';
const errors = require('../../../lib/errors');
const Instance = require('../../../lib/instance');

function createTestInstance(version, cliVersion, previousVersion = null, config = {}) {
    return class extends Instance {
        get version() {
            return version;
        }
        get cliVersion() {
            return cliVersion;
        }
        get previousVersion() {
            return previousVersion;
        }
        get config() {
            return config;
        }
    };
}

describe('Unit: Commands > Update', function () {
    after(() => {
        cleanupTestFolders();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('configureOptions adds setup & doctor options', function () {
        const superStub = sinon.stub().returnsArg(1);
        const doctorStub = sinon.stub().returnsArg(1);

        // Needed for extension
        class Command {}
        Command.configureOptions = superStub;

        const InstallCommand = proxyquire(modulePath, {
            './doctor': {configureOptions: doctorStub},
            '../command': Command
        });

        const result = InstallCommand.configureOptions('install', {yargs: true}, [{extensiona: true}]);
        expect(result).to.deep.equal({yargs: true});
        expect(superStub.calledOnce).to.be.true;
        expect(superStub.calledWithExactly('install', {yargs: true}, [{extensiona: true}])).to.be.true;
    });

    describe('run', function () {
        it('doesn\'t run database migrations if active blog version is ^2.0.0', function () {
            const migratorStub = {
                migrate: sinon.stub().resolves(),
                rollback: sinon.stub().resolves()
            };

            const majorUpdateStub = sinon.stub();

            const UpdateCommand = proxyquire(modulePath, {
                '../tasks/migrator': migratorStub,
                '../tasks/major-update': majorUpdateStub
            });

            const ghostConfig = configStub();
            ghostConfig.get.withArgs('database').returns({
                client: 'sqlite3'
            });

            const ui = {log: sinon.stub(), listr: sinon.stub(), run: sinon.stub()};
            const system = {getInstance: sinon.stub()};

            ui.run.callsFake(fn => fn());
            ui.listr.callsFake((tasks, ctx) => Promise.each(tasks, (task) => {
                if ((task.skip && task.skip(ctx)) || (task.enabled && !task.enabled(ctx))) {
                    return;
                }

                return task.task(ctx);
            }));

            const TestInstance = createTestInstance('2.0.0', '1.8.0', null, ghostConfig);
            const fakeInstance = sinon.stub(new TestInstance(ui, system, '/var/www/ghost'));
            system.getInstance.returns(fakeInstance);
            fakeInstance.running.resolves(true);
            const cmdInstance = new UpdateCommand(ui, system);

            const versionStub = sinon.stub(cmdInstance, 'version').resolves(true);
            const runCommandStub = sinon.stub(cmdInstance, 'runCommand').resolves();
            const downloadStub = sinon.stub(cmdInstance, 'downloadAndUpdate').resolves();
            const removeOldVersionsStub = sinon.stub(cmdInstance, 'removeOldVersions').resolves();
            const linkStub = sinon.stub(cmdInstance, 'link').resolves();
            const stopStub = sinon.stub(cmdInstance, 'stop').resolves();

            return cmdInstance.run({version: '2.0.1', force: false, zip: '', v1: false}).then(() => {
                expect(runCommandStub.calledTwice).to.be.true;
                expect(ui.run.calledOnce).to.be.true;
                expect(versionStub.calledOnce).to.be.true;
                expect(versionStub.args[0][0]).to.deep.equal({
                    version: '2.0.1',
                    force: false,
                    instance: fakeInstance,
                    activeVersion: '2.0.0',
                    zip: '',
                    v1: false
                });
                expect(ui.log.calledOnce).to.be.false;
                expect(ui.listr.calledOnce).to.be.true;
                expect(removeOldVersionsStub.calledOnce).to.be.true;
                expect(stopStub.calledOnce).to.be.true;
                expect(linkStub.calledOnce).to.be.true;
                expect(downloadStub.calledOnce).to.be.true;
                expect(fakeInstance.running.calledOnce).to.be.true;
                expect(fakeInstance.loadRunningEnvironment.calledOnce).to.be.true;
                expect(fakeInstance.checkEnvironment.calledOnce).to.be.true;

                expect(migratorStub.migrate.called).to.be.false;
                expect(migratorStub.rollback.called).to.be.false;

                expect(majorUpdateStub.called).to.be.false;
            });
        });

        it('doesn\'t run database migrations if version to migrate to is ^2.0.0', function () {
            const migratorStub = {
                migrate: sinon.stub().resolves(),
                rollback: sinon.stub().resolves()
            };

            const majorUpdateStub = sinon.stub();

            const UpdateCommand = proxyquire(modulePath, {
                '../tasks/migrator': migratorStub,
                '../tasks/major-update': majorUpdateStub
            });

            const ghostConfig = configStub();
            ghostConfig.get.withArgs('database').returns({
                client: 'sqlite3'
            });

            const ui = {log: sinon.stub(), listr: sinon.stub(), run: sinon.stub()};
            const system = {getInstance: sinon.stub()};

            ui.run.callsFake(fn => fn());
            ui.listr.callsFake((tasks, ctx) => Promise.each(tasks, (task) => {
                if ((task.skip && task.skip(ctx)) || (task.enabled && !task.enabled(ctx))) {
                    return;
                }

                return task.task(ctx);
            }));

            const TestInstance = createTestInstance('1.25.0', '1.8.0', null, ghostConfig);
            const fakeInstance = sinon.stub(new TestInstance(ui, system, '/var/www/ghost'));
            system.getInstance.returns(fakeInstance);
            fakeInstance.running.resolves(true);
            const cmdInstance = new UpdateCommand(ui, system);

            const versionStub = sinon.stub(cmdInstance, 'version').resolves(true);
            const runCommandStub = sinon.stub(cmdInstance, 'runCommand').resolves();
            const downloadStub = sinon.stub(cmdInstance, 'downloadAndUpdate').resolves();
            const removeOldVersionsStub = sinon.stub(cmdInstance, 'removeOldVersions').resolves();
            const linkStub = sinon.stub(cmdInstance, 'link').resolves();
            const stopStub = sinon.stub(cmdInstance, 'stop').resolves();

            return cmdInstance.run({version: '2.0.0', force: false, zip: '', v1: false}).then(() => {
                expect(runCommandStub.calledTwice).to.be.true;
                expect(ui.run.calledOnce).to.be.true;
                expect(versionStub.calledOnce).to.be.true;
                expect(versionStub.args[0][0]).to.deep.equal({
                    version: '2.0.0',
                    force: false,
                    instance: fakeInstance,
                    activeVersion: '1.25.0',
                    zip: '',
                    v1: false
                });
                expect(ui.log.calledOnce).to.be.false;
                expect(ui.listr.calledOnce).to.be.true;
                expect(removeOldVersionsStub.calledOnce).to.be.true;
                expect(stopStub.calledOnce).to.be.true;
                expect(linkStub.calledOnce).to.be.true;
                expect(downloadStub.calledOnce).to.be.true;
                expect(fakeInstance.running.calledOnce).to.be.true;
                expect(fakeInstance.loadRunningEnvironment.calledOnce).to.be.true;
                expect(fakeInstance.checkEnvironment.calledOnce).to.be.true;

                expect(migratorStub.migrate.called).to.be.false;
                expect(migratorStub.rollback.called).to.be.false;

                expect(majorUpdateStub.called).to.be.true;
            });
        });

        it('doesn\'t run tasks if no new versions are available', function () {
            const UpdateCommand = require(modulePath);
            const ui = {log: sinon.stub(), listr: sinon.stub(), run: sinon.stub()};
            const system = {getInstance: sinon.stub()};
            ui.run.callsFake(fn => fn());

            const TestInstance = createTestInstance('1.0.0', '1.0.0-beta.1');
            const fakeInstance = sinon.stub(new TestInstance(ui, system, '/var/www/ghost'));
            system.getInstance.returns(fakeInstance);
            fakeInstance.running.resolves(true);
            const cmdInstance = new UpdateCommand(ui, system);
            const versionStub = sinon.stub(cmdInstance, 'version').resolves(false);
            const runCommandStub = sinon.stub(cmdInstance, 'runCommand').resolves();

            return cmdInstance.run({version: '1.0.0', force: false, zip: '', v1: false}).then(() => {
                expect(runCommandStub.calledTwice).to.be.true;
                expect(ui.run.calledOnce).to.be.true;
                expect(versionStub.calledOnce).to.be.true;
                expect(versionStub.args[0][0]).to.deep.equal({
                    version: '1.0.0',
                    force: false,
                    instance: fakeInstance,
                    activeVersion: '1.0.0',
                    zip: '',
                    v1: false
                });
                expect(ui.log.calledTwice).to.be.true;
                expect(ui.log.args[0][0]).to.match(/install is using out-of-date configuration/);
                expect(ui.log.args[1][0]).to.match(/up to date/);
                expect(ui.listr.called).to.be.false;
                expect(fakeInstance.running.calledOnce).to.be.true;
                expect(fakeInstance.loadRunningEnvironment.calledOnce).to.be.true;
                expect(fakeInstance.checkEnvironment.calledOnce).to.be.true;
            });
        });

        it('rejects if rollback is passed and no previous version exists', function () {
            const UpdateCommand = require(modulePath);
            const ui = {log: sinon.stub(), listr: sinon.stub(), run: sinon.stub()};
            const system = {getInstance: sinon.stub()};
            ui.run.callsFake(fn => fn());

            const TestInstance = createTestInstance('1.0.0', '1.0.0');
            const fakeInstance = sinon.stub(new TestInstance(ui, system, '/var/www/ghost'));
            system.getInstance.returns(fakeInstance);
            fakeInstance.running.resolves(true);
            const cmdInstance = new UpdateCommand(ui, system);
            const versionStub = sinon.stub(cmdInstance, 'version').resolves(false);
            const runCommandStub = sinon.stub(cmdInstance, 'runCommand').resolves();

            return cmdInstance.run({rollback: true}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(runCommandStub.called).to.be.false;
                expect(error).to.be.an.instanceof(Error);
                expect(error.message).to.equal('No previous version found');
                expect(ui.run.called).to.be.false;
                expect(versionStub.called).to.be.false;
                expect(ui.log.called).to.be.false;
                expect(ui.listr.called).to.be.false;
            });
        });

        it('populates context with correct data if rollback is passed and previous version exists', function () {
            const UpdateCommand = require(modulePath);
            const ui = {log: sinon.stub(), listr: sinon.stub(), run: sinon.stub()};
            const system = {getInstance: sinon.stub()};
            ui.run.callsFake(fn => fn());

            const TestInstance = createTestInstance('1.1.0', '1.0.0', '1.0.0');
            const fakeInstance = sinon.stub(new TestInstance(ui, system, '/var/www/ghost'));
            system.getInstance.returns(fakeInstance);
            fakeInstance.running.resolves(false);
            const cmdInstance = new UpdateCommand(ui, system);
            const versionStub = sinon.stub(cmdInstance, 'version').resolves(false);
            const runCommandStub = sinon.stub(cmdInstance, 'runCommand').resolves();
            sinon.stub(process, 'cwd').returns(fakeInstance.dir);

            return cmdInstance.run({rollback: true, force: false, zip: '', v1: false}).then(() => {
                expect(runCommandStub.calledTwice).to.be.true;
                expect(ui.run.calledOnce).to.be.true;
                expect(versionStub.calledOnce).to.be.true;
                expect(versionStub.args[0][0]).to.deep.equal({
                    version: '1.0.0',
                    force: false,
                    instance: fakeInstance,
                    activeVersion: '1.1.0',
                    installPath: '/var/www/ghost/versions/1.0.0',
                    rollback: true,
                    zip: '',
                    v1: false
                });
                expect(ui.log.calledOnce).to.be.true;
                expect(ui.log.args[0][0]).to.match(/up to date/);
                expect(ui.listr.called).to.be.false;
                expect(fakeInstance.running.calledOnce).to.be.true;
                expect(fakeInstance.loadRunningEnvironment.called).to.be.false;
                expect(fakeInstance.checkEnvironment.calledOnce).to.be.true;
            });
        });

        it('runs all tasks if rollback is false and running is true', function () {
            const migratorStub = {
                migrate: sinon.stub().resolves(),
                rollback: sinon.stub().resolves()
            };

            const majorUpdateStub = sinon.stub();

            const UpdateCommand = proxyquire(modulePath, {
                '../tasks/migrator': migratorStub,
                '../tasks/major-update': majorUpdateStub
            });

            const ui = {log: sinon.stub(), listr: sinon.stub(), run: sinon.stub()};
            const system = {getInstance: sinon.stub()};
            ui.run.callsFake(fn => fn());
            ui.listr.callsFake((tasks, ctx) => Promise.each(tasks, (task) => {
                if (task.skip && task.skip(ctx) || (task.enabled && !task.enabled(ctx))) {
                    return;
                }

                return task.task(ctx);
            }));

            const TestInstance = createTestInstance('1.0.0', '1.0.0');
            const fakeInstance = sinon.stub(new TestInstance(ui, system, '/var/www/ghost'));
            system.getInstance.returns(fakeInstance);
            fakeInstance.running.resolves(true);
            const cmdInstance = new UpdateCommand(ui, system);
            const versionStub = sinon.stub(cmdInstance, 'version').resolves(true);
            const stopStub = sinon.stub(cmdInstance, 'stop').resolves();
            const restartStub = sinon.stub(cmdInstance, 'restart').resolves();
            const linkStub = sinon.stub(cmdInstance, 'link').resolves();
            sinon.stub(process, 'cwd').returns(fakeInstance.dir);
            const downloadStub = sinon.stub(cmdInstance, 'downloadAndUpdate');
            const removeOldVersionsStub = sinon.stub(cmdInstance, 'removeOldVersions');
            const runCommandStub = sinon.stub(cmdInstance, 'runCommand').resolves();

            return cmdInstance.run({version: '1.1.0', rollback: false, force: false, restart: true}).then(() => {
                expect(runCommandStub.calledTwice).to.be.true;
                expect(ui.run.calledOnce).to.be.true;
                expect(versionStub.calledOnce).to.be.true;
                expect(ui.log.called).to.be.false;
                expect(ui.listr.called).to.be.true;

                expect(downloadStub.calledOnce).to.be.true;
                expect(stopStub.calledOnce).to.be.true;
                expect(linkStub.calledOnce).to.be.true;
                expect(migratorStub.migrate.calledOnce).to.be.true;
                expect(migratorStub.rollback.calledOnce).to.be.false;
                expect(restartStub.calledOnce).to.be.true;
                expect(removeOldVersionsStub.calledOnce).to.be.true;

                expect(majorUpdateStub.called).to.be.false;
            });
        });

        it('skips download, migrate, and removeOldVersion tasks if rollback is true', function () {
            const migratorStub = {
                migrate: sinon.stub().resolves(),
                rollback: sinon.stub().resolves()
            };
            const majorUpdateStub = sinon.stub();

            const UpdateCommand = proxyquire(modulePath, {
                '../tasks/migrator': migratorStub,
                '../tasks/major-update': majorUpdateStub
            });

            const config = configStub();
            config.get.withArgs('cli-version').returns('1.0.0');
            config.get.withArgs('active-version').returns('1.1.0');
            config.get.withArgs('previous-version').returns('1.0.0');
            const ui = {log: sinon.stub(), listr: sinon.stub(), run: sinon.stub()};
            const system = {getInstance: sinon.stub()};
            ui.run.callsFake(fn => fn());
            ui.listr.callsFake((tasks, ctx) => Promise.each(tasks, (task) => {
                if (task.skip && task.skip(ctx) || (task.enabled && !task.enabled(ctx))) {
                    return;
                }

                return task.task(ctx);
            }));

            const TestInstance = createTestInstance('1.1.0', '1.0.0', '1.0.0');
            const fakeInstance = sinon.stub(new TestInstance(ui, system, '/var/www/ghost'));
            system.getInstance.returns(fakeInstance);
            fakeInstance.running.resolves(false);
            const cmdInstance = new UpdateCommand(ui, system);
            const versionStub = sinon.stub(cmdInstance, 'version').resolves(true);
            sinon.stub(cmdInstance, 'stop').resolves();
            sinon.stub(cmdInstance, 'restart').resolves();
            sinon.stub(cmdInstance, 'link').resolves();
            sinon.stub(process, 'cwd').returns(fakeInstance.dir);
            const downloadStub = sinon.stub(cmdInstance, 'downloadAndUpdate');
            const removeOldVersionsStub = sinon.stub(cmdInstance, 'removeOldVersions');
            const runCommandStub = sinon.stub(cmdInstance, 'runCommand').resolves();

            return cmdInstance.run({rollback: true, force: false, zip: '', restart: true, v1: true}).then(() => {
                const expectedCtx = {
                    version: '1.0.0',
                    force: false,
                    instance: fakeInstance,
                    activeVersion: '1.1.0',
                    installPath: '/var/www/ghost/versions/1.0.0',
                    rollback: true,
                    zip: '',
                    v1: true
                };

                expect(runCommandStub.calledTwice).to.be.true;
                expect(ui.run.calledOnce).to.be.true;
                expect(versionStub.calledOnce).to.be.true;
                expect(versionStub.args[0][0]).to.deep.equal(expectedCtx);
                expect(ui.log.called).to.be.false;
                expect(ui.listr.called).to.be.true;

                expect(downloadStub.called).to.be.false;
                expect(migratorStub.migrate.called).to.be.false;
                expect(migratorStub.rollback.called).to.be.true;
                expect(removeOldVersionsStub.called).to.be.false;

                expect(majorUpdateStub.called).to.be.false;
            });
        });

        it('skips stop task if running returns false', function () {
            const migratorStub = {
                migrate: sinon.stub().resolves(),
                rollback: sinon.stub().resolves()
            };
            const UpdateCommand = proxyquire(modulePath, {
                '../tasks/migrator': migratorStub
            });
            const ui = {log: sinon.stub(), listr: sinon.stub(), run: sinon.stub()};
            const system = {getInstance: sinon.stub()};
            ui.run.callsFake(fn => fn());
            ui.listr.callsFake((tasks, ctx) => Promise.each(tasks, (task) => {
                if ((task.skip && task.skip(ctx)) || (task.enabled && !task.enabled(ctx))) {
                    return;
                }

                return task.task(ctx);
            }));

            const TestInstance = createTestInstance('1.1.0', '1.0.0', '1.0.0');
            const fakeInstance = sinon.stub(new TestInstance(ui, system, '/var/www/ghost'));
            system.getInstance.returns(fakeInstance);
            fakeInstance.running.resolves(false);
            const cmdInstance = new UpdateCommand(ui, system);
            const versionStub = sinon.stub(cmdInstance, 'version').resolves(true);
            const stopStub = sinon.stub(cmdInstance, 'stop').resolves();
            sinon.stub(cmdInstance, 'restart').resolves();
            sinon.stub(cmdInstance, 'link').resolves();
            sinon.stub(process, 'cwd').returns(fakeInstance.dir);
            sinon.stub(cmdInstance, 'downloadAndUpdate');
            sinon.stub(cmdInstance, 'removeOldVersions');
            const runCommandStub = sinon.stub(cmdInstance, 'runCommand').resolves();

            return cmdInstance.run({rollback: true, force: false, zip: '', restart: true, v1: false}).then(() => {
                const expectedCtx = {
                    version: '1.0.0',
                    force: false,
                    instance: fakeInstance,
                    activeVersion: '1.1.0',
                    installPath: '/var/www/ghost/versions/1.0.0',
                    rollback: true,
                    zip: '',
                    v1: false
                };

                expect(runCommandStub.calledTwice).to.be.true;
                expect(ui.run.calledOnce).to.be.true;
                expect(versionStub.calledOnce).to.be.true;
                expect(versionStub.args[0][0]).to.deep.equal(expectedCtx);
                expect(ui.log.called).to.be.false;
                expect(ui.listr.called).to.be.true;

                expect(stopStub.called).to.be.false;
            });
        });

        it('attempts to auto-rollback on ghost error', function () {
            const UpdateCommand = require(modulePath);
            const errObj = new errors.GhostError('should_rollback');

            const ui = {
                log: sinon.stub(),
                listr: sinon.stub().rejects(errObj),
                run: sinon.stub().callsFake(fn => fn())
            };
            const system = {getInstance: sinon.stub()};
            const TestInstance = createTestInstance('1.1.0', '1.0.0', '1.0.0');
            const fakeInstance = sinon.stub(new TestInstance(ui, system, '/var/www/ghost'));
            system.getInstance.returns(fakeInstance);
            fakeInstance.running.resolves(false);

            const cmdInstance = new UpdateCommand(ui, system);
            const rollback = cmdInstance.rollbackFromFail = sinon.stub().rejects(new Error('rollback_successful'));
            cmdInstance.runCommand = sinon.stub().resolves(true);
            cmdInstance.version = sinon.stub().callsFake((context) => {
                context.version = '1.1.1';
                return true;
            });

            return cmdInstance.run({}).then(() => {
                expect(false, 'Promise should have rejected').to.be.true;
            }).catch((error) => {
                expect(error.message).to.equal('rollback_successful');
                expect(rollback.calledOnce).to.be.true;
                expect(rollback.calledWithExactly(errObj, '1.1.1', undefined)).to.be.true;
            });
        });

        it('does not attempts to auto-rollback on cli error', function () {
            const UpdateCommand = require(modulePath);
            const errObj = new Error('do_nothing');

            const ui = {
                log: sinon.stub(),
                listr: sinon.stub().rejects(errObj),
                run: sinon.stub().callsFake(fn => fn())
            };
            const system = {getInstance: sinon.stub()};
            const TestInstance = createTestInstance('1.1.0', '1.0.0', '1.0.0');
            const fakeInstance = sinon.stub(new TestInstance(ui, system, '/var/www/ghost'));
            system.getInstance.returns(fakeInstance);
            fakeInstance.running.resolves(false);

            const cmdInstance = new UpdateCommand(ui, system);
            const rollback = cmdInstance.rollbackFromFail = sinon.stub();
            cmdInstance.runCommand = sinon.stub().resolves(true);
            cmdInstance.version = sinon.stub().callsFake((context) => {
                context.version = '1.1.1';
                return true;
            });

            return cmdInstance.run({}).then(() => {
                expect(false, 'Promise should have rejected').to.be.true;
            }).catch((error) => {
                expect(error.message).to.equal('do_nothing');
                expect(rollback.called).to.be.false;
            });
        });

        it('does not attempts to auto-rollback on ghost error if rollback is used', function () {
            const UpdateCommand = require(modulePath);
            const errObj = new errors.GhostError('do_nothing');

            const ui = {
                log: sinon.stub(),
                listr: sinon.stub().rejects(errObj),
                run: sinon.stub().callsFake(fn => fn())
            };
            const system = {getInstance: sinon.stub()};
            const TestInstance = createTestInstance('1.1.0', '1.0.0', '1.0.0');
            const fakeInstance = sinon.stub(new TestInstance(ui, system, '/var/www/ghost'));
            system.getInstance.returns(fakeInstance);
            fakeInstance.running.resolves(false);

            const cmdInstance = new UpdateCommand(ui, system);
            const rollback = cmdInstance.rollbackFromFail = sinon.stub();
            cmdInstance.runCommand = sinon.stub().resolves(true);
            cmdInstance.version = sinon.stub().callsFake((context) => {
                context.version = '1.1.1';
                return true;
            });

            return cmdInstance.run({rollback: true}).then(() => {
                expect(false, 'Promise should have rejected').to.be.true;
            }).catch((error) => {
                expect(error.message).to.equal('do_nothing');
                expect(rollback.called).to.be.false;
            });
        });
    });

    describe('downloadAndUpdate task', function () {
        it('runs yarnInstall task, sets title', function () {
            const yarnInstallStub = sinon.stub().resolves();
            const UpdateCommand = proxyquire(modulePath, {
                '../tasks/yarn-install': yarnInstallStub
            });
            const instance = new UpdateCommand({}, {});
            const env = setupTestFolder();
            const ctx = {
                installPath: path.join(env.dir, 'versions/1.0.0'),
                version: '1.0.0'
            };
            const task = {};

            return instance.downloadAndUpdate(ctx, task).then(() => {
                expect(yarnInstallStub.calledOnce).to.be.true;
                expect(task.title).to.equal('Downloading and updating Ghost to v1.0.0');
            });
        });

        it('skips if install path exists and force is false', function () {
            const yarnInstallStub = sinon.stub().resolves();
            const UpdateCommand = proxyquire(modulePath, {
                '../tasks/yarn-install': yarnInstallStub
            });
            const instance = new UpdateCommand({}, {});
            const envCfg = {
                dirs: ['versions/1.0.0', 'versions/1.0.1'],
                links: [['versions/1.0.0', 'current']]
            };
            const env = setupTestFolder(envCfg);
            const ctx = {
                installPath: path.join(env.dir, 'versions/1.0.1'),
                force: false
            };
            const task = {skip: sinon.stub()};

            expect(fs.existsSync(ctx.installPath)).to.be.true;

            return instance.downloadAndUpdate(ctx, task).then(() => {
                expect(fs.existsSync(ctx.installPath)).to.be.true;
                expect(yarnInstallStub.called).to.be.false;
                expect(task.skip.calledOnce).to.be.true;
            });
        });

        it('removes install path if it exists and force is true', function () {
            const yarnInstallStub = sinon.stub().resolves();
            const UpdateCommand = proxyquire(modulePath, {
                '../tasks/yarn-install': yarnInstallStub
            });
            const instance = new UpdateCommand({}, {});
            const envCfg = {
                dirs: ['versions/1.0.0', 'versions/1.0.1'],
                links: [['versions/1.0.0', 'current']]
            };
            const env = setupTestFolder(envCfg);
            const ctx = {
                installPath: path.join(env.dir, 'versions/1.0.1'),
                force: true
            };

            expect(fs.existsSync(ctx.installPath)).to.be.true;

            return instance.downloadAndUpdate(ctx, {}).then(() => {
                expect(fs.existsSync(ctx.installPath)).to.be.false;
                expect(yarnInstallStub.calledOnce).to.be.true;
            });
        });
    });

    describe('stop task', function () {
        it('runs stop command', function () {
            const UpdateCommand = proxyquire(modulePath, {
                './stop': {StopCommand: true}
            });
            const instance = new UpdateCommand({}, {});
            const runCommandStub = sinon.stub(instance, 'runCommand').resolves();

            return instance.stop().then(() => {
                expect(runCommandStub.calledOnce).to.be.true;
                expect(runCommandStub.args[0][0]).to.deep.equal({StopCommand: true});
                expect(runCommandStub.args[0][1]).to.deep.equal({quiet: true});
            });
        });

        it('swallows SystemError with "no instance running" message', function () {
            const UpdateCommand = proxyquire(modulePath, {
                './stop': {StopCommand: true}
            });
            const instance = new UpdateCommand({}, {});
            const runCommandStub = sinon.stub(instance, 'runCommand').rejects(new errors.SystemError(
                'No running Ghost instance found here'
            ));

            return instance.stop().then(() => {
                expect(runCommandStub.calledOnce).to.be.true;
                expect(runCommandStub.args[0][0]).to.deep.equal({StopCommand: true});
                expect(runCommandStub.args[0][1]).to.deep.equal({quiet: true});
            });
        });

        it('rethrows any unexpected error', function () {
            const UpdateCommand = proxyquire(modulePath, {
                './stop': {StopCommand: true}
            });
            const instance = new UpdateCommand({}, {});
            const runCommandStub = sinon.stub(instance, 'runCommand').rejects(new Error('uh-oh'));

            return instance.stop().then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(Error);
                expect(error.message).to.equal('uh-oh');
                expect(runCommandStub.calledOnce).to.be.true;
                expect(runCommandStub.args[0][0]).to.deep.equal({StopCommand: true});
                expect(runCommandStub.args[0][1]).to.deep.equal({quiet: true});
            });
        });
    });

    it('restart task runs start command', function () {
        const UpdateCommand = proxyquire(modulePath, {
            './start': {StartCommand: true}
        });
        const instance = new UpdateCommand({}, {});
        const runCommandStub = sinon.stub(instance, 'runCommand').resolves();

        return instance.restart().then(() => {
            expect(runCommandStub.calledOnce).to.be.true;
            expect(runCommandStub.args[0][0]).to.deep.equal({StartCommand: true});
            expect(runCommandStub.args[0][1]).to.deep.equal({quiet: true});
        });
    });

    describe('removeOldVersions', function () {
        it('skips if there are 5 or fewer versions installed', function () {
            const dirs = [
                'versions/1.4.0',
                'versions/1.5.0',
                'versions/1.5.1',
                'versions/1.5.2'
            ];
            const env = setupTestFolder({dirs: dirs});
            const UpdateCommand = require(modulePath);
            const instance = new UpdateCommand({}, {});
            sinon.stub(process, 'cwd').returns(env.dir);
            const skipStub = sinon.stub();

            return instance.removeOldVersions({}, {skip: skipStub}).then(() => {
                expect(skipStub.calledOnce).to.be.true;

                dirs.forEach((version) => {
                    expect(fs.existsSync(path.join(env.dir, version))).to.be.true;
                });
            });
        });

        it('keeps only the 5 most recent versions', function () {
            const envCfg = {
                dirs: [
                    'versions/1.0.0-beta.2',
                    'versions/1.0.0-RC.1',
                    'versions/1.0.0',
                    'versions/1.0.2',
                    'versions/1.1.0',
                    'versions/1.2.0',
                    'versions/1.3.0',
                    'versions/1.4.0',
                    'versions/1.5.0'
                ]
            };
            const env = setupTestFolder(envCfg);
            const UpdateCommand = require(modulePath);
            const instance = new UpdateCommand({}, {});
            sinon.stub(process, 'cwd').returns(env.dir);
            const keptVersions = [
                '1.1.0',
                '1.2.0',
                '1.3.0',
                '1.4.0',
                '1.5.0'
            ];
            const removedVersions = [
                '1.0.0-beta.2',
                '1.0.0-RC.1',
                '1.0.0',
                '1.0.2'
            ];

            return instance.removeOldVersions().then(() => {
                keptVersions.forEach((version) => {
                    expect(fs.existsSync(path.join(env.dir, 'versions', version))).to.be.true;
                });

                removedVersions.forEach((version) => {
                    expect(fs.existsSync(path.join(env.dir, 'versions', version))).to.be.false;
                });
            });
        });
    });

    describe('version', function () {
        it('resolves with true if rollback is true', function () {
            const UpdateCommand = require(modulePath);
            const instance = new UpdateCommand({}, {});

            return instance.version({rollback: true}).then((result) => {
                expect(result).to.be.true;
            });
        });

        it('calls resolveVersion util with correct args and sets version and installPath in context', function () {
            const resolveVersion = sinon.stub().resolves('1.0.1');
            const UpdateCommand = proxyquire(modulePath, {
                '../utils/resolve-version': resolveVersion
            });
            const instance = new UpdateCommand({}, {});
            const context = {
                rollback: false,
                force: false,
                version: null,
                activeVersion: '1.0.0',
                v1: true
            };
            sinon.stub(process, 'cwd').returns('/var/www/ghost');

            return instance.version(context).then((result) => {
                expect(result).to.be.true;
                expect(resolveVersion.calledOnce).to.be.true;
                expect(resolveVersion.calledWithExactly(null, '1.0.0', true, false)).to.be.true;
                expect(context.version).to.equal('1.0.1');
                expect(context.installPath).to.equal('/var/www/ghost/versions/1.0.1');
            });
        });

        it('calls versionFromZip resolver with zip path if zip is passed', function () {
            const resolveVersion = sinon.stub().resolves('1.0.1');
            const zipVersion = sinon.stub().resolves('1.1.0');
            const UpdateCommand = proxyquire(modulePath, {
                '../utils/resolve-version': resolveVersion,
                '../utils/version-from-zip': zipVersion
            });
            const instance = new UpdateCommand({}, {});
            const context = {
                rollback: false,
                force: false,
                version: null,
                activeVersion: '1.0.0',
                zip: '/some/zip/file.zip',
                v1: true
            };
            sinon.stub(process, 'cwd').returns('/var/www/ghost');

            return instance.version(context).then((result) => {
                expect(result).to.be.true;
                expect(resolveVersion.called).to.be.false;
                expect(zipVersion.calledOnce).to.be.true;
                expect(zipVersion.calledWithExactly('/some/zip/file.zip', '1.0.0', false)).to.be.true;
                expect(context.version).to.equal('1.1.0');
                expect(context.installPath).to.equal('/var/www/ghost/versions/1.1.0');
            });
        });

        it('swallows CliErrors from resolveVersion util', function () {
            const resolveVersion = sinon.stub().rejects(new errors.CliError('No valid versions found'));
            const UpdateCommand = proxyquire(modulePath, {
                '../utils/resolve-version': resolveVersion
            });
            const instance = new UpdateCommand({}, {});
            const context = {
                rollback: false,
                force: true,
                version: null,
                activeVersion: '1.0.0',
                v1: false
            };

            return instance.version(context).then((result) => {
                expect(result).to.be.false;
                expect(resolveVersion.calledOnce).to.be.true;
                expect(resolveVersion.calledWithExactly(null, '1.0.0', false, true)).to.be.true;
            });
        });

        it('re-throws non CliErrors from resolveVersion util', function () {
            const resolveVersion = sinon.stub().callsFake(() => Promise.reject(new Error('something bad'))
            );
            const UpdateCommand = proxyquire(modulePath, {
                '../utils/resolve-version': resolveVersion
            });
            const instance = new UpdateCommand({}, {});
            const context = {
                rollback: false,
                force: true,
                version: null,
                activeVersion: '1.0.0',
                v1: false
            };

            return instance.version(context).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(Error);
                expect(error.message).to.equal('something bad');
                expect(resolveVersion.calledOnce).to.be.true;
                expect(resolveVersion.calledWithExactly(null, '1.0.0', false, true)).to.be.true;
            });
        });
    });

    describe('rollbackFromFail', function () {
        const ui = {
            log: sinon.stub(),
            confirm: sinon.stub(),
            error: sinon.stub()
        };

        const system = {
            getInstance() {
                return {previousVersion: '1.0.0'};
            }
        };

        afterEach(function () {
            ui.log.reset();
            ui.confirm.reset();
            ui.error.reset();
        });

        it('Asks to rollback by default', function () {
            const UpdateCommand = require(modulePath);
            const expectedQuestion = 'Unable to upgrade Ghost from v1.0.0 to v1.1.1. Would you like to revert back to v1.0.0?';
            const update = new UpdateCommand(ui, system, '/var/www/ghost');
            ui.confirm.resolves(true);
            update.run = sinon.stub().resolves();

            return update.rollbackFromFail(false, '1.1.1').then(() => {
                expect(ui.log.calledOnce).to.be.true;
                expect(ui.error.calledOnce).to.be.true;

                expect(ui.confirm.calledOnce).to.be.true;
                expect(ui.confirm.calledWithExactly(expectedQuestion, true)).to.be.true;
                expect(update.run.calledOnce).to.be.true;
            });
        });

        it('Listens to the user', function () {
            const UpdateCommand = require(modulePath);
            const update = new UpdateCommand(ui, system, '/var/www/ghost');

            ui.confirm.resolves(false);
            update.run = sinon.stub().resolves();

            return update.rollbackFromFail(false, '1.1.1').then(() => {
                expect(ui.log.calledOnce).to.be.true;
                expect(ui.error.calledOnce).to.be.true;

                expect(ui.confirm.calledOnce).to.be.true;
                expect(update.run.called).to.be.false;
            });
        });

        it('Force update', function () {
            const UpdateCommand = require(modulePath);
            const update = new UpdateCommand(ui, system, '/var/www/ghost');
            update.run = sinon.stub().resolves();

            return update.rollbackFromFail(new Error('test'), '1.1.1', true).then(() => {
                expect(ui.log.calledOnce).to.be.true;
                expect(ui.error.calledOnce).to.be.true;

                expect(ui.confirm.called).to.be.false;
                expect(update.run.calledOnce).to.be.true;
            });
        });

        it('Re-runs `run` using rollback', function () {
            const UpdateCommand = require(modulePath);
            const update = new UpdateCommand(ui, system, '/var/www/ghost');

            update.run = sinon.stub().resolves();
            return update.rollbackFromFail(false, '1.1.1', true).then(() => {
                expect(ui.log.calledOnce).to.be.true;
                expect(ui.error.calledOnce).to.be.true;

                expect(update.run.calledOnce).to.be.true;
                expect(update.run.calledWithExactly({rollback: true, restart: true})).to.be.true;
            });
        });
    });

    describe('link', function () {
        const UpdateCommand = require(modulePath);

        it('does things correctly with normal upgrade', function () {
            const command = new UpdateCommand({}, {});
            const envCfg = {
                dirs: ['versions/1.0.0', 'versions/1.0.1'],
                links: [['versions/1.0.0', 'current']]
            };
            const env = setupTestFolder(envCfg);
            sinon.stub(process, 'cwd').returns(env.dir);
            const instance = {
                version: '1.0.0'
            };
            const context = {
                installPath: path.join(env.dir, 'versions/1.0.1'),
                version: '1.0.1',
                rollback: false,
                instance
            };

            command.link(context);
            expect(fs.readlinkSync(path.join(env.dir, 'current'))).to.equal(path.join(env.dir, 'versions/1.0.1'));
            expect(instance.version).to.equal('1.0.1');
            expect(instance.previousVersion).to.equal('1.0.0');
        });

        it('does things correctly with rollback', function () {
            const command = new UpdateCommand({}, {});
            const envCfg = {
                dirs: ['versions/1.0.0', 'versions/1.0.1'],
                links: [['versions/1.0.1', 'current']]
            };
            const env = setupTestFolder(envCfg);
            sinon.stub(process, 'cwd').returns(env.dir);
            const instance = {
                version: '1.0.1'
            };
            const context = {
                installPath: path.join(env.dir, 'versions/1.0.0'),
                version: '1.0.0',
                rollback: true,
                instance
            };

            command.link(context);
            expect(fs.readlinkSync(path.join(env.dir, 'current'))).to.equal(path.join(env.dir, 'versions/1.0.0'));
            expect(instance.version).to.equal('1.0.0');
            expect(instance.previousVersion).to.be.null;
        });
    });
});
