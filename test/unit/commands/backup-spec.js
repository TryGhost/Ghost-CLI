'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const fs = require('fs-extra');
const setupEnv = require('../../utils/env');
const Promise = require('bluebird');
const path = require('path');

const modulePath = '../../../lib/commands/backup';
const Instance = require('../../../lib/instance');
const envConfig = {
    dirs: ['content'],
    files: [{
        path: './.ghost-cli',
        content: {
            'cli-version': '1.1.1',
            'active-version': '1.8.0',
            name: 'ghost-local',
            'previous-version': '1.7.1'
        },
        json: true
    }, {
        path: './config.production.json',
        content: {
            test: 'true'
        },
        json: true
    }, {
        path: './content/nap.json',
        content: {
            itsreal: true
        },
        json: true
    }]
};

const listrCall = (tasks, ctx) => {
    return Promise.each(tasks, (task) => {
        if (task.skip && task.skip(ctx)) {
            return;
        }

        return task.task(ctx);
    });
};

describe('Unit: Commands > Backup', function () {
    describe('Basic functionality', function () {
        it('Saves to the right location', function () {
            this.timeout(3000);
            const env = setupEnv(envConfig);
            const dbbackupStub = sinon.stub().resolves({});
            const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);
            const system = {getInstance: sinon.stub(), environment: 'production'};
            const fsstub = {
                readFileSync: sinon.stub(),
                ensureDirSync: fs.ensureDirSync,
                access: fs.access,
                W_OK: fs.W_OK
            };

            fsstub.readFileSync.callsFake((location) => {
                return fs.readFileSync(path.join(env.dir, location));
            });

            const datetime = (new Date()).toJSON().substring(0, 10);
            const exporterLocation = path.join(env.dir, 'current/core/server/data/export/');
            const BackupCommand = proxyquire(modulePath, {
                [exporterLocation]: {
                    doExport: dbbackupStub
                },
                'fs-extra': fsstub
            });

            const ui = {log: sinon.stub(), listr: sinon.stub().callsFake(listrCall)};
            const fakeInstance = sinon.stub(new Instance(ui, system, env.dir));
            system.getInstance.returns(fakeInstance);
            fakeInstance.running.returns(false);
            fakeInstance.name = 'ghoster'

            const backup = new BackupCommand(ui,system);

            backup.run({}).then(() => {
                cwdStub.restore();
                expect(fs.existsSync(path.join(env.dir, `ghoster.backup.${datetime}.zip`))).to.be.true;
                expect(ui.listr.calledTwice).to.be.true;
                expect(ui.log.called).to.be.false;
                env.cleanup();
            });
        });

        it('Accepts the output flag', function () {
            const env = setupEnv(envConfig);
            const dbbackupStub = sinon.stub().resolves({});
            const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);
            const system = {getInstance: sinon.stub(), environment: 'production'};
            const fsstub = {
                readFileSync: sinon.stub(),
                ensureDirSync: fs.ensureDirSync,
                access: fs.access,
                W_OK: fs.W_OK
            };

            fsstub.readFileSync.callsFake((location) => {
                return fs.readFileSync(path.join(env.dir, location));
            });

            const datetime = (new Date()).toJSON().substring(0, 10);
            const exporterLocation = path.join(env.dir, 'current/core/server/data/export/');
            const BackupCommand = proxyquire(modulePath, {
                [exporterLocation]: {
                    doExport: dbbackupStub
                },
                'fs-extra': fsstub
            });

            const ui = {log: sinon.stub(), listr: sinon.stub().callsFake(listrCall)};
            const fakeInstance = sinon.stub(new Instance(ui, system, env.dir));
            system.getInstance.returns(fakeInstance);
            fakeInstance.running.returns(false);
            fakeInstance.name = 'ghoster'

            const backup = new BackupCommand(ui,system);

            backup.run({output: './a'}).then(() => {
                cwdStub.restore();
                expect(fs.existsSync(path.join(env.dir, `a/ghoster.backup.${datetime}.zip`))).to.be.true;
                expect(ui.listr.calledTwice).to.be.true;
                expect(ui.log.called).to.be.false;
                env.cleanup();
            });
        });

        it('Complains about write permissions', function () {
            const env = setupEnv(envConfig);
            const dbbackupStub = sinon.stub().resolves({});
            const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);
            const system = {getInstance: sinon.stub(), environment: 'production'};
            const fsstub = {
                readFileSync: sinon.stub(),
                access: sinon.stub().throws(new Error()),
                ensureDirSync: sinon.stub().throws(new Error()),
                W_OK: fs.W_OK
            };

            fsstub.readFileSync.callsFake((location) => {
                return fs.readFileSync(path.join(env.dir, location));
            });

            const datetime = (new Date()).toJSON().substring(0, 10);
            const exporterLocation = path.join(env.dir, 'current/core/server/data/export/');
            const BackupCommand = proxyquire(modulePath, {
                [exporterLocation]: {
                    doExport: dbbackupStub
                },
                'fs-extra': fsstub
            });

            const ui = {log: sinon.stub(), listr: sinon.stub().callsFake(listrCall)};
            const fakeInstance = sinon.stub(new Instance(ui, system, env.dir));
            system.getInstance.returns(fakeInstance);
            fakeInstance.running.returns(true);
            fakeInstance.name = 'ghoster'

            const backup = new BackupCommand(ui,system);

            backup.run({}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch(() => {
                cwdStub.restore();
                expect(fs.existsSync(path.join(env.dir, `ghoster.backup.${datetime}.zip`))).to.be.false;
                expect(ui.listr.calledOnce).to.be.true;
                expect(ui.log.calledOnce).to.be.true;
                env.cleanup();
            });
        });

        it('Warns of running instance', function () {
            const env = setupEnv(envConfig);
            const dbbackupStub = sinon.stub().resolves({});
            const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);
            const system = {getInstance: sinon.stub(), environment: 'production'};
            const fsstub = {
                readFileSync: sinon.stub(),
                ensureDirSync: fs.ensureDirSync,
                access: fs.access,
                W_OK: fs.W_OK
            };

            fsstub.readFileSync.callsFake((location) => {
                return fs.readFileSync(path.join(env.dir, location));
            });

            const datetime = (new Date()).toJSON().substring(0, 10);
            const exporterLocation = path.join(env.dir, 'current/core/server/data/export/');
            const BackupCommand = proxyquire(modulePath, {
                [exporterLocation]: {
                    doExport: dbbackupStub
                },
                'fs-extra': fsstub
            });

            const ui = {log: sinon.stub(), listr: sinon.stub().callsFake(listrCall)};
            const fakeInstance = sinon.stub(new Instance(ui, system, env.dir));
            system.getInstance.returns(fakeInstance);
            fakeInstance.running.returns(true);
            fakeInstance.name = 'ghoster'

            const backup = new BackupCommand(ui,system);

            backup.run({}).then(() => {
                cwdStub.restore();
                expect(fs.existsSync(path.join(env.dir, `ghoster.backup.${datetime}.zip`))).to.be.true;
                expect(ui.listr.calledTwice).to.be.true;
                expect(ui.log.calledOnce).to.be.true;
                env.cleanup();
            });
        });
    });

    describe('Database Exports', function () {
        it('Fails when the exporter doesn\'t load', function () {
            const env = setupEnv(envConfig);
            const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);
            const system = {getInstance: sinon.stub(), environment: 'production'};
            const fsstub = {
                readFileSync: sinon.stub(),
                ensureDirSync: fs.ensureDirSync,
                access: fs.access,
                W_OK: fs.W_OK
            };

            fsstub.readFileSync.callsFake((location) => {
                return fs.readFileSync(path.join(env.dir, location));
            });

            const datetime = (new Date()).toJSON().substring(0, 10);
            const BackupCommand = proxyquire(modulePath, {
                'fs-extra': fsstub
            });

            const ui = {log: sinon.stub(), listr: sinon.stub().callsFake(listrCall)};
            const fakeInstance = sinon.stub(new Instance(ui, system, env.dir));
            system.getInstance.returns(fakeInstance);
            fakeInstance.running.returns(false);
            fakeInstance.name = 'ghoster'

            const backup = new BackupCommand(ui,system);

            backup.run({}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) =>{
                cwdStub.restore();
                // @todo: figure out why this returns true
                expect(fs.existsSync(path.join(env.dir, `ghoster.backup.${datetime}.zip`))).to.be.false;
                expect(ui.listr.calledTwice).to.be.true;
                expect(ui.log.called).to.be.false;
                expect(error.message).to.match(/Unable to initialize database exporter/)
                env.cleanup();
            });
        });

        it('Errors on MYSQL connection failure', function () {
            const mysqlError = new Error('You\'ve been ghosted!');
            mysqlError.code = 'ECONNREFUSED';
            const env = setupEnv(envConfig);
            const dbbackupStub = sinon.stub().rejects(mysqlError);
            const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);
            const system = {getInstance: sinon.stub(), environment: 'production'};
            const fsstub = {
                readFileSync: sinon.stub(),
                access: fs.access,
                ensureDirSync: fs.ensureDirSync,
                W_OK: fs.W_OK
            };

            fsstub.readFileSync.callsFake((location) => {
                return fs.readFileSync(path.join(env.dir, location));
            });

            const datetime = (new Date()).toJSON().substring(0, 10);
            const exporterLocation = path.join(env.dir, 'current/core/server/data/export/');
            const BackupCommand = proxyquire(modulePath, {
                [exporterLocation]: {
                    doExport: dbbackupStub
                },
                'fs-extra': fsstub
            });

            const ui = {log: sinon.stub(), listr: sinon.stub().callsFake(listrCall)};
            const fakeInstance = sinon.stub(new Instance(ui, system, env.dir));
            system.getInstance.returns(fakeInstance);
            fakeInstance.running.returns(false);
            fakeInstance.name = 'ghoster'

            const backup = new BackupCommand(ui,system);

            backup.run({}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                cwdStub.restore();
                expect(fs.existsSync(path.join(env.dir, `ghoster.backup.${datetime}.zip`))).to.be.false;
                expect(ui.listr.calledTwice).to.be.true;
                expect(ui.log.called).to.be.false;
                expect(error.message).to.match(/Unable to connect to MySQL/);
                env.cleanup();
            });
        });

        it('Fails on unknown export failure', function () {
            const env = setupEnv(envConfig);
            const dbbackupStub = sinon.stub().rejects(new Error('What even is backing up'));
            const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);
            const system = {getInstance: sinon.stub(), environment: 'production'};
            const fsstub = {
                readFileSync: sinon.stub(),
                access: fs.access,
                ensureDirSync: fs.ensureDirSync,
                W_OK: fs.W_OK
            };

            fsstub.readFileSync.callsFake((location) => {
                return fs.readFileSync(path.join(env.dir, location));
            });

            const datetime = (new Date()).toJSON().substring(0, 10);
            const exporterLocation = path.join(env.dir, 'current/core/server/data/export/');
            const BackupCommand = proxyquire(modulePath, {
                [exporterLocation]: {
                    doExport: dbbackupStub
                },
                'fs-extra': fsstub
            });

            const ui = {log: sinon.stub(), listr: sinon.stub().callsFake(listrCall)};
            const fakeInstance = sinon.stub(new Instance(ui, system, env.dir));
            system.getInstance.returns(fakeInstance);
            fakeInstance.running.returns(false);
            fakeInstance.name = 'ghoster'

            const backup = new BackupCommand(ui,system);

            backup.run({}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                cwdStub.restore();
                expect(fs.existsSync(path.join(env.dir, `ghoster.backup.${datetime}.zip`))).to.be.false;
                expect(ui.listr.calledTwice).to.be.true;
                expect(ui.log.called).to.be.false;
                expect(error.message).to.match(/What even is backing up/);
                env.cleanup();
            });
        });
    });

    describe('File Exports', function () {
        it('Fails if core data files can\'t be read', function () {
            const env = setupEnv(envConfig);
            const dbbackupStub = sinon.stub().resolves({});
            const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);
            const system = {getInstance: sinon.stub(), environment: 'production'};
            const fsstub = {
                readFileSync: sinon.stub().throws(new Error('File doesn\'t exist')),
                ensureDirSync: fs.ensureDirSync,
                access: fs.access,
                W_OK: fs.W_OK
            };

            const datetime = (new Date()).toJSON().substring(0, 10);
            const exporterLocation = path.join(env.dir, 'current/core/server/data/export/');
            const BackupCommand = proxyquire(modulePath, {
                [exporterLocation]: {
                    doExport: dbbackupStub
                },
                'fs-extra': fsstub
            });

            const ui = {log: sinon.stub(), listr: sinon.stub().callsFake(listrCall)};
            const fakeInstance = sinon.stub(new Instance(ui, system, env.dir));
            system.getInstance.returns(fakeInstance);
            fakeInstance.running.returns(false);
            fakeInstance.name = 'ghoster'

            const backup = new BackupCommand(ui,system);

            backup.run({}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                cwdStub.restore();
                expect(fs.existsSync(path.join(env.dir, `ghoster.backup.${datetime}.zip`))).to.be.false;
                expect(ui.listr.calledTwice).to.be.true;
                expect(ui.log.called).to.be.false;
                expect(error.message).to.match(/Failed to create zip file/);
                env.cleanup();
            });
        });

        it('Fails if content folder can\'t be read', function () {
            const env = setupEnv({
                files: [{
                    path: './.ghost-cli',
                    content: {
                        'cli-version': '1.1.1',
                        'active-version': '1.8.0',
                        name: 'ghost-local',
                        'previous-version': '1.7.1'
                    },
                    json: true
                }, {
                    path: './config.production.json',
                    content: {
                        test: 'true'
                    },
                    json: true
                }]
            });
            const dbbackupStub = sinon.stub().resolves({});
            const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);
            const system = {getInstance: sinon.stub(), environment: 'production'};
            const fsstub = {
                readFileSync: sinon.stub(),
                ensureDirSync: fs.ensureDirSync,
                access: fs.access,
                W_OK: fs.W_OK
            };

            fsstub.readFileSync.callsFake((location) => {
                return fs.readFileSync(path.join(env.dir, location));
            });

            const datetime = (new Date()).toJSON().substring(0, 10);
            const exporterLocation = path.join(env.dir, 'current/core/server/data/export/');
            const BackupCommand = proxyquire(modulePath, {
                [exporterLocation]: {
                    doExport: dbbackupStub
                },
                'fs-extra': fsstub
            });

            const ui = {log: sinon.stub(), listr: sinon.stub().callsFake(listrCall)};
            const fakeInstance = sinon.stub(new Instance(ui, system, env.dir));
            system.getInstance.returns(fakeInstance);
            fakeInstance.running.returns(false);
            fakeInstance.name = 'ghoster'

            const backup = new BackupCommand(ui,system);

            backup.run({}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                cwdStub.restore();
                expect(fs.existsSync(path.join(env.dir, `ghoster.backup.${datetime}.zip`))).to.be.false;
                expect(ui.listr.calledTwice).to.be.true;
                expect(ui.log.called).to.be.false;
                expect(error.message).to.match(/Failed to read content folder/);
                env.cleanup();
            });
        });

        it('Links in content folder are skipped & user is notified', function () {
            const env = setupEnv({
                dirs: ['content','linker'],
                links: [['linker','content/casper']],
                files: [{
                    path: './.ghost-cli',
                    content: {
                        'cli-version': '1.1.1',
                        'active-version': '1.8.0',
                        name: 'ghost-local',
                        'previous-version': '1.7.1'
                    },
                    json: true
                }, {
                    path: './config.production.json',
                    content: {
                        test: 'true'
                    },
                    json: true
                }, {
                    path: './content/nap.json',
                    content: {
                        isreal: true
                    },
                    json: true
                }]
            });
            const dbbackupStub = sinon.stub().resolves({});
            const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);
            const system = {getInstance: sinon.stub(), environment: 'production'};
            const fsstub = {
                readFileSync: sinon.stub(),
                ensureDirSync: fs.ensureDirSync,
                access: fs.access,
                W_OK: fs.W_OK
            };

            fsstub.readFileSync.callsFake((location) => {
                return fs.readFileSync(path.join(env.dir, location));
            });

            const datetime = (new Date()).toJSON().substring(0, 10);
            const exporterLocation = path.join(env.dir, 'current/core/server/data/export/');
            const BackupCommand = proxyquire(modulePath, {
                [exporterLocation]: {
                    doExport: dbbackupStub
                },
                'fs-extra': fsstub
            });

            const ui = {log: sinon.stub(), listr: sinon.stub().callsFake(listrCall)};
            const fakeInstance = sinon.stub(new Instance(ui, system, env.dir));
            system.getInstance.returns(fakeInstance);
            fakeInstance.running.returns(false);
            fakeInstance.name = 'ghoster'

            const backup = new BackupCommand(ui,system);

            backup.run({}).then(() => {
                cwdStub.restore();
                expect(fs.existsSync(path.join(env.dir, `ghoster.backup.${datetime}.zip`))).to.be.true;
                expect(ui.listr.calledTwice).to.be.true;
                expect(ui.log.calledOnce).to.be.true;
                env.cleanup();
            });
        });
    });
});
