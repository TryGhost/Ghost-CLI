'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const configStub = require('../../utils/config-stub');
const setupEnv = require('../../utils/env');
const Promise = require('bluebird');
const path = require('path');
const fs = require('fs-extra');

const modulePath = '../../../lib/commands/update';
const errors = require('../../../lib/errors');
const Instance = require('../../../lib/instance');

describe('Unit: Commands > Update', function () {
    describe('run', function () {
        it('doesn\'t run tasks if no new versions are available', function () {
            const UpdateCommand = require(modulePath);
            const config = configStub();
            config.get.withArgs('cli-version').returns('1.0.0-beta.1');
            config.get.withArgs('active-version').returns('1.0.0');
            const ui = {log: sinon.stub(), listr: sinon.stub(), run: sinon.stub()};
            const system = {getInstance: sinon.stub()};
            ui.run.callsFake(fn => fn());

            class TestInstance extends Instance {
                get cliConfig() { return config; }
            }
            const fakeInstance = sinon.stub(new TestInstance(ui, system, '/var/www/ghost'));
            system.getInstance.returns(fakeInstance);
            fakeInstance.running.returns(true);
            const cmdInstance = new UpdateCommand(ui, system);
            const versionStub = sinon.stub(cmdInstance, 'version').resolves(false);
            const runCommandStub = sinon.stub(cmdInstance, 'runCommand').resolves();

            return cmdInstance.run({version: '1.0.0', force: false, zip: ''}).then(() => {
                expect(runCommandStub.calledOnce).to.be.true;
                expect(ui.run.calledOnce).to.be.true;
                expect(versionStub.calledOnce).to.be.true;
                expect(versionStub.args[0][0]).to.deep.equal({
                    version: '1.0.0',
                    force: false,
                    instance: fakeInstance,
                    activeVersion: '1.0.0',
                    zip: ''
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
            const config = configStub();
            config.get.withArgs('cli-version').returns('1.0.0');
            config.get.withArgs('active-version').returns('1.0.0');
            config.get.withArgs('previous-version').returns(null);
            const ui = {log: sinon.stub(), listr: sinon.stub(), run: sinon.stub()};
            const system = {getInstance: sinon.stub()};
            ui.run.callsFake(fn => fn());

            class TestInstance extends Instance {
                get cliConfig() { return config; }
            }
            const fakeInstance = sinon.stub(new TestInstance(ui, system, '/var/www/ghost'));
            system.getInstance.returns(fakeInstance);
            fakeInstance.running.returns(true);
            const cmdInstance = new UpdateCommand(ui, system);
            const versionStub = sinon.stub(cmdInstance, 'version').resolves(false);
            const runCommandStub = sinon.stub(cmdInstance, 'runCommand').resolves();

            return cmdInstance.run({rollback: true}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(runCommandStub.calledOnce).to.be.false;
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
            const config = configStub();
            config.get.withArgs('cli-version').returns('1.0.0');
            config.get.withArgs('active-version').returns('1.1.0');
            config.get.withArgs('previous-version').returns('1.0.0');
            const ui = {log: sinon.stub(), listr: sinon.stub(), run: sinon.stub()};
            const system = {getInstance: sinon.stub()};
            ui.run.callsFake(fn => fn());

            class TestInstance extends Instance {
                get cliConfig() { return config; }
            }
            const fakeInstance = sinon.stub(new TestInstance(ui, system, '/var/www/ghost'));
            system.getInstance.returns(fakeInstance);
            fakeInstance.running.returns(false);
            const cmdInstance = new UpdateCommand(ui, system);
            const versionStub = sinon.stub(cmdInstance, 'version').resolves(false);
            const runCommandStub = sinon.stub(cmdInstance, 'runCommand').resolves();
            const cwdStub = sinon.stub(process, 'cwd').returns(fakeInstance.dir);

            return cmdInstance.run({rollback: true, force: false, zip: ''}).then(() => {
                expect(runCommandStub.calledOnce).to.be.true;
                cwdStub.restore();

                expect(ui.run.calledOnce).to.be.true;
                expect(versionStub.calledOnce).to.be.true;
                expect(versionStub.args[0][0]).to.deep.equal({
                    version: '1.0.0',
                    force: false,
                    instance: fakeInstance,
                    activeVersion: '1.1.0',
                    installPath: '/var/www/ghost/versions/1.0.0',
                    rollback: true,
                    zip: ''
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
            const migrateStub = sinon.stub().resolves();
            const UpdateCommand = proxyquire(modulePath, {
                '../tasks/migrate': migrateStub
            });
            const config = configStub();
            config.get.withArgs('cli-version').returns('1.0.0');
            config.get.withArgs('active-version').returns('1.0.0');
            const ui = {log: sinon.stub(), listr: sinon.stub(), run: sinon.stub()};
            const system = {getInstance: sinon.stub()};
            ui.run.callsFake(fn => fn());
            ui.listr.callsFake((tasks, ctx) => {
                return Promise.each(tasks, (task) => {
                    if (task.skip && task.skip(ctx)) {
                        return;
                    }

                    return task.task(ctx);
                });
            });

            class TestInstance extends Instance {
                get cliConfig() { return config; }
            }
            const fakeInstance = sinon.stub(new TestInstance(ui, system, '/var/www/ghost'));
            system.getInstance.returns(fakeInstance);
            fakeInstance.running.returns(true);
            const cmdInstance = new UpdateCommand(ui, system);
            const versionStub = sinon.stub(cmdInstance, 'version').resolves(true);
            const stopStub = sinon.stub(cmdInstance, 'stop').resolves();
            const restartStub = sinon.stub(cmdInstance, 'restart').resolves();
            const linkStub = sinon.stub(cmdInstance, 'link').resolves();
            const cwdStub = sinon.stub(process, 'cwd').returns(fakeInstance.dir);
            const downloadStub = sinon.stub(cmdInstance, 'downloadAndUpdate');
            const removeOldVersionsStub = sinon.stub(cmdInstance, 'removeOldVersions');
            const runCommandStub = sinon.stub(cmdInstance, 'runCommand').resolves();

            return cmdInstance.run({version: '1.1.0', rollback: false, force: false, restart: true}).then(() => {
                cwdStub.restore();

                expect(runCommandStub.calledOnce).to.be.true;
                expect(ui.run.calledOnce).to.be.true;
                expect(versionStub.calledOnce).to.be.true;
                expect(ui.log.called).to.be.false;
                expect(ui.listr.called).to.be.true;

                expect(downloadStub.calledOnce).to.be.true;
                expect(stopStub.calledOnce).to.be.true;
                expect(linkStub.calledOnce).to.be.true;
                expect(migrateStub.calledOnce).to.be.true;
                expect(restartStub.calledOnce).to.be.true;
                expect(removeOldVersionsStub.calledOnce).to.be.true;
            });
        })

        it('skips download, migrate, and removeOldVersion tasks if rollback is true', function () {
            const migrateStub = sinon.stub().resolves();
            const UpdateCommand = proxyquire(modulePath, {
                '../tasks/migrate': migrateStub
            });
            const config = configStub();
            config.get.withArgs('cli-version').returns('1.0.0');
            config.get.withArgs('active-version').returns('1.1.0');
            config.get.withArgs('previous-version').returns('1.0.0');
            const ui = {log: sinon.stub(), listr: sinon.stub(), run: sinon.stub()};
            const system = {getInstance: sinon.stub()};
            ui.run.callsFake(fn => fn());
            ui.listr.callsFake((tasks, ctx) => {
                return Promise.each(tasks, (task) => {
                    if (task.skip && task.skip(ctx)) {
                        return;
                    }

                    return task.task(ctx);
                });
            });

            class TestInstance extends Instance {
                get cliConfig() { return config; }
            }
            const fakeInstance = sinon.stub(new TestInstance(ui, system, '/var/www/ghost'));
            system.getInstance.returns(fakeInstance);
            fakeInstance.running.returns(false);
            const cmdInstance = new UpdateCommand(ui, system);
            const versionStub = sinon.stub(cmdInstance, 'version').resolves(true);
            sinon.stub(cmdInstance, 'stop').resolves();
            sinon.stub(cmdInstance, 'restart').resolves();
            sinon.stub(cmdInstance, 'link').resolves();
            const cwdStub = sinon.stub(process, 'cwd').returns(fakeInstance.dir);
            const downloadStub = sinon.stub(cmdInstance, 'downloadAndUpdate');
            const removeOldVersionsStub = sinon.stub(cmdInstance, 'removeOldVersions');
            const runCommandStub = sinon.stub(cmdInstance, 'runCommand').resolves();

            return cmdInstance.run({rollback: true, force: false, zip: '', restart: true}).then(() => {
                cwdStub.restore();

                const expectedCtx = {
                    version: '1.0.0',
                    force: false,
                    instance: fakeInstance,
                    activeVersion: '1.1.0',
                    installPath: '/var/www/ghost/versions/1.0.0',
                    rollback: true,
                    zip: ''
                };

                expect(runCommandStub.calledOnce).to.be.true;
                expect(ui.run.calledOnce).to.be.true;
                expect(versionStub.calledOnce).to.be.true;
                expect(versionStub.args[0][0]).to.deep.equal(expectedCtx);
                expect(ui.log.called).to.be.false;
                expect(ui.listr.called).to.be.true;

                expect(downloadStub.called).to.be.false;
                expect(migrateStub.called).to.be.false;
                expect(removeOldVersionsStub.called).to.be.false;
            });
        });

        it('skips stop task if running returns false', function () {
            const migrateStub = sinon.stub().resolves();
            const UpdateCommand = proxyquire(modulePath, {
                '../tasks/migrate': migrateStub
            });
            const config = configStub();
            config.get.withArgs('cli-version').returns('1.0.0');
            config.get.withArgs('active-version').returns('1.1.0');
            config.get.withArgs('previous-version').returns('1.0.0');
            const ui = {log: sinon.stub(), listr: sinon.stub(), run: sinon.stub()};
            const system = {getInstance: sinon.stub()};
            ui.run.callsFake(fn => fn());
            ui.listr.callsFake((tasks, ctx) => {
                return Promise.each(tasks, (task) => {
                    if (task.skip && task.skip(ctx)) {
                        return;
                    }

                    return task.task(ctx);
                });
            });

            class TestInstance extends Instance {
                get cliConfig() { return config; }
            }
            const fakeInstance = sinon.stub(new TestInstance(ui, system, '/var/www/ghost'));
            system.getInstance.returns(fakeInstance);
            fakeInstance.running.returns(false);
            const cmdInstance = new UpdateCommand(ui, system);
            const versionStub = sinon.stub(cmdInstance, 'version').resolves(true);
            const stopStub = sinon.stub(cmdInstance, 'stop').resolves();
            sinon.stub(cmdInstance, 'restart').resolves();
            sinon.stub(cmdInstance, 'link').resolves();
            const cwdStub = sinon.stub(process, 'cwd').returns(fakeInstance.dir);
            sinon.stub(cmdInstance, 'downloadAndUpdate');
            sinon.stub(cmdInstance, 'removeOldVersions');
            const runCommandStub = sinon.stub(cmdInstance, 'runCommand').resolves();


            return cmdInstance.run({rollback: true, force: false, zip: '', restart: true}).then(() => {
                cwdStub.restore();
                const expectedCtx = {
                    version: '1.0.0',
                    force: false,
                    instance: fakeInstance,
                    activeVersion: '1.1.0',
                    installPath: '/var/www/ghost/versions/1.0.0',
                    rollback: true,
                    zip: ''
                };

                expect(runCommandStub.calledOnce).to.be.true;
                expect(ui.run.calledOnce).to.be.true;
                expect(versionStub.calledOnce).to.be.true;
                expect(versionStub.args[0][0]).to.deep.equal(expectedCtx);
                expect(ui.log.called).to.be.false;
                expect(ui.listr.called).to.be.true;

                expect(stopStub.called).to.be.false;
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
            const env = setupEnv();
            const ctx = {
                installPath: path.join(env.dir, 'versions/1.0.0'),
                version: '1.0.0'
            };
            const task = {};

            return instance.downloadAndUpdate(ctx, task).then(() => {
                expect(yarnInstallStub.calledOnce).to.be.true;
                expect(task.title).to.equal('Downloading and updating Ghost to v1.0.0');
                env.cleanup();
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
            const env = setupEnv(envCfg);
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

                env.cleanup();
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
            const env = setupEnv(envCfg);
            const ctx = {
                installPath: path.join(env.dir, 'versions/1.0.1'),
                force: true
            };

            expect(fs.existsSync(ctx.installPath)).to.be.true;

            return instance.downloadAndUpdate(ctx, {}).then(() => {
                expect(fs.existsSync(ctx.installPath)).to.be.false;
                expect(yarnInstallStub.calledOnce).to.be.true;

                env.cleanup();
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
            const env = setupEnv({dirs: dirs});
            const UpdateCommand = require(modulePath);
            const instance = new UpdateCommand({}, {});
            const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);
            const skipStub = sinon.stub();

            return instance.removeOldVersions({}, {skip: skipStub}).then(() => {
                cwdStub.restore();
                expect(skipStub.calledOnce).to.be.true;

                dirs.forEach((version) => {
                    expect(fs.existsSync(path.join(env.dir, version))).to.be.true;
                });

                env.cleanup();
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
            const env = setupEnv(envCfg);
            const UpdateCommand = require(modulePath);
            const instance = new UpdateCommand({}, {});
            const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);
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
                cwdStub.restore();

                keptVersions.forEach((version) => {
                    expect(fs.existsSync(path.join(env.dir, 'versions', version))).to.be.true;
                });

                removedVersions.forEach((version) => {
                    expect(fs.existsSync(path.join(env.dir, 'versions', version))).to.be.false;
                });

                env.cleanup();
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
                activeVersion: '1.0.0'
            };
            const cwdStub = sinon.stub(process, 'cwd').returns('/var/www/ghost');

            return instance.version(context).then((result) => {
                expect(result).to.be.true;
                expect(resolveVersion.calledOnce).to.be.true;
                expect(resolveVersion.calledWithExactly(null, '1.0.0')).to.be.true;
                expect(context.version).to.equal('1.0.1');
                expect(context.installPath).to.equal('/var/www/ghost/versions/1.0.1');
                cwdStub.restore();
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
                zip: '/some/zip/file.zip'
            };
            const cwdStub = sinon.stub(process, 'cwd').returns('/var/www/ghost');

            return instance.version(context).then((result) => {
                expect(result).to.be.true;
                expect(resolveVersion.called).to.be.false;
                expect(zipVersion.calledOnce).to.be.true;
                expect(zipVersion.calledWithExactly('/some/zip/file.zip', '1.0.0')).to.be.true;
                expect(context.version).to.equal('1.1.0');
                expect(context.installPath).to.equal('/var/www/ghost/versions/1.1.0');
                cwdStub.restore();
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
                activeVersion: '1.0.0'
            };

            return instance.version(context).then((result) => {
                expect(result).to.be.false;
                expect(resolveVersion.calledOnce).to.be.true;
                expect(resolveVersion.calledWithExactly(null, null)).to.be.true;
            });
        });

        it('re-throws non CliErrors from resolveVersion util', function () {
            const resolveVersion = sinon.stub().callsFake(() => {
                // sinon's reject handling doesn't work quite well enough
                // for this so we do it manually
                return Promise.reject(new Error('something bad'));
            });
            const UpdateCommand = proxyquire(modulePath, {
                '../utils/resolve-version': resolveVersion
            });
            const instance = new UpdateCommand({}, {});
            const context = {
                rollback: false,
                force: true,
                version: null,
                activeVersion: '1.0.0'
            };

            return instance.version(context).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(Error);
                expect(error.message).to.equal('something bad');
                expect(resolveVersion.calledOnce).to.be.true;
                expect(resolveVersion.calledWithExactly(null, null)).to.be.true;
            });
        });
    });

    describe('link', function () {
        const UpdateCommand = require(modulePath);

        it('does things correctly with normal upgrade', function () {
            const instance = new UpdateCommand({}, {});
            const envCfg = {
                dirs: ['versions/1.0.0', 'versions/1.0.1'],
                links: [['versions/1.0.0', 'current']]
            }
            const env = setupEnv(envCfg);
            const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);
            const config = configStub();
            config.get.withArgs('active-version').returns('1.0.0');
            const context = {
                installPath: path.join(env.dir, 'versions/1.0.1'),
                version: '1.0.1',
                rollback: false,
                instance: {
                    cliConfig: config
                }
            };

            instance.link(context);
            expect(fs.readlinkSync(path.join(env.dir, 'current'))).to.equal(path.join(env.dir, 'versions/1.0.1'));
            expect(config.set.calledTwice).to.be.true;
            expect(config.set.calledWithExactly('previous-version', '1.0.0')).to.be.true;
            expect(config.set.calledWithExactly('active-version', '1.0.1')).to.be.true;
            expect(config.save.calledOnce).to.be.true;

            cwdStub.restore();
            env.cleanup();
        });

        it('does things correctly with rollback', function () {
            const instance = new UpdateCommand({}, {});
            const envCfg = {
                dirs: ['versions/1.0.0', 'versions/1.0.1'],
                links: [['versions/1.0.1', 'current']]
            }
            const env = setupEnv(envCfg);
            const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);
            const config = configStub();
            config.get.withArgs('active-version').returns('1.0.1');
            const context = {
                installPath: path.join(env.dir, 'versions/1.0.0'),
                version: '1.0.0',
                rollback: true,
                instance: {
                    cliConfig: config
                }
            };

            instance.link(context);
            expect(fs.readlinkSync(path.join(env.dir, 'current'))).to.equal(path.join(env.dir, 'versions/1.0.0'));
            expect(config.set.calledTwice).to.be.true;
            expect(config.set.calledWithExactly('previous-version', null)).to.be.true;
            expect(config.set.calledWithExactly('active-version', '1.0.0')).to.be.true;
            expect(config.save.calledOnce).to.be.true;

            cwdStub.restore();
            env.cleanup();
        });
    });
});
