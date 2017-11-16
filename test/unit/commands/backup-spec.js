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
            const env = setupEnv(envConfig);
            const dbbackupStub = sinon.stub().resolves({});
            const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);
            const system = {
                getInstance: sinon.stub(),
                environment: 'production',
                hook: sinon.stub().resolves([])
            };
            const fsstub = {
                readFileSync: sinon.stub(),
                ensureDirSync: fs.ensureDirSync,
                accessSync: fs.access,
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

            return backup.run({}).then(() => {
                cwdStub.restore();
                expect(fs.existsSync(path.join(env.dir, `ghoster.backup.${datetime}.zip`))).to.be.true;
                expect(system.hook.calledOnce).to.be.true;
                expect(ui.listr.calledOnce).to.be.true;
                expect(ui.log.calledOnce).to.be.true;
                env.cleanup();
            });
        });

        it('Accepts the output flag', function () {
            const env = setupEnv(envConfig);
            const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);
            const localContext = {
                argv: {output: './path/to/test'},
                instance: {
                    name: 'ghoster',
                    running: () => false,
                    ui: {log: sinon.stub()},
                    checkEnvironment: () => true
                }
            };
            const fsstub = {
                ensureDirSync: fs.ensureDirSync,
                access: fs.access,
                W_OK: fs.W_OK
            };

            const datetime = (new Date()).toJSON().substring(0, 10);
            const BackupCommand = proxyquire(modulePath, {'fs-extra': fsstub});
            const backup = new BackupCommand();

            return backup.initialize(localContext).then(() => {
                cwdStub.restore();
                const expectedPath = path.join(env.dir, `path/to/test/ghoster.backup.${datetime}.zip`);
                expect(localContext.saveLocation).to.equal(expectedPath);
                expect(fs.existsSync(path.join(env.dir, 'path/to/test'))).to.be.true;
                expect(localContext.instance.ui.log.called).to.be.false;
                env.cleanup();
            });
        });

        it('Complains about write permissions', function () {
            const cwdStub = sinon.stub(process, 'cwd').returns('./');
            const localContext = {
                argv: {},
                instance: {
                    name: 'ghoster',
                    running: sinon.stub(),
                    ui: {log: sinon.stub()},
                    checkEnvironment: sinon.stub()
                }
            };
            const fsstub = {ensureDirSync: sinon.stub().throws(new Error())};
            const BackupCommand = proxyquire(modulePath, {'fs-extra': fsstub});
            const backup = new BackupCommand();

            return backup.initialize(localContext).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch(() => {
                cwdStub.restore();
                expect(localContext.saveLocation).to.equal('./');
                expect(localContext.instance.ui.log.calledOnce).to.be.true;
                expect(localContext.zipFile).to.equal(undefined);
                expect(localContext.instance.running.called).to.be.false;
            });
        });

        it('Warns of running instance', function () {
            const cwdStub = sinon.stub(process, 'cwd').returns('/var/www/ghost');
            const localContext = {
                argv: {},
                instance: {
                    name: 'ghoster',
                    running: sinon.stub().returns(true),
                    ui: {log: sinon.stub()},
                    checkEnvironment: sinon.stub(),
                    loadRunningEnvironment: sinon.stub()
                }
            };
            const fsstub = {
                ensureDirSync: sinon.stub(),
                access: sinon.stub(),
                W_OK: fs.W_OK
            };
            const BackupCommand = proxyquire(modulePath, {'fs-extra': fsstub});
            const backup = new BackupCommand();

            return backup.initialize(localContext).then(() => {
                cwdStub.restore();
                expect(localContext.instance.ui.log.calledOnce).to.be.true;
                expect(localContext.zipFile).to.exist;
            });
        });
    });

    describe('Database Exports', function () {
        it('Fails when the exporter doesn\'t load', function () {
            const cwdStub = sinon.stub(process, 'cwd').returns('./');
            const BackupCommand = require(modulePath);
            const backup = new BackupCommand();

            return backup.backupDatabase({}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) =>{
                cwdStub.restore();
                expect(error.message).to.match(/Unable to initialize database exporter/)
            });
        });

        it('Errors on MYSQL connection failure', function () {
            const mysqlError = new Error('You\'ve been ghosted!');
            mysqlError.code = 'ECONNREFUSED';
            const dbbackupStub = sinon.stub().rejects(mysqlError);
            const cwdStub = sinon.stub(process, 'cwd').returns('./');
            const exporterLocation = 'current/core/server/data/export/';
            const BackupCommand = proxyquire(modulePath, {[exporterLocation]: {doExport: dbbackupStub}});
            const backup = new BackupCommand();

            return backup.backupDatabase({}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                cwdStub.restore();
                expect(dbbackupStub.calledOnce).to.be.true;
                expect(error.message).to.match(/Unable to connect to MySQL/);
            });
        });

        it('Fails on unknown export failure', function () {
            const dbbackupStub = sinon.stub().rejects(new Error('What even is backing up'));
            const cwdStub = sinon.stub(process, 'cwd').returns('./');
            const exporterLocation = 'current/core/server/data/export/';
            const BackupCommand = proxyquire(modulePath, {[exporterLocation]: {doExport: dbbackupStub}});
            const backup = new BackupCommand();

            return backup.backupDatabase({}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                cwdStub.restore();
                expect(dbbackupStub.calledOnce).to.be.true;
                expect(error.message).to.match(/What even is backing up/);
            });
        });
    });

    describe('File Exports', function () {
        it('Fails if core data files can\'t be read', function () {
            const context = {
                env: '',
                zipFile: sinon.stub()
            };
            const fsstub = {readFileSync: sinon.stub().throws(new Error('File doesn\'t exist'))};
            const BackupCommand = proxyquire(modulePath, {'fs-extra': fsstub});
            const backup = new BackupCommand();

            return backup.backupConfig(context).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(context.zipFile.called).to.be.false;
                expect(error.message).to.match(/Failed backing up configuration files/);
            });
        });

        it('Fails if content folder can\'t be read', function () {
            const walkerStub = sinon.stub().throws(new Error('Access denied'))
            const BackupCommand = proxyquire(modulePath, {'klaw-sync': walkerStub});
            const backup = new BackupCommand();

            return backup.backupContent({}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error.message).to.match(/Failed to read content folder/);
            });
        });

        it('Warns when not backing up a file', function () {
            const fakeFiles = [{path: './blah/blah/blah.pdf'}, {path: './blah/blah/bleh.bin'}, {path: './blah/blah/blu.txt'}];
            const walkerStub = sinon.stub().returns(fakeFiles);
            const cwdStub = sinon.stub(process, 'cwd').returns('./');
            const fsstub = {readFileSync: sinon.stub()};
            const context = {
                zipFile: {addFile: sinon.stub()},
                instance: {ui: {log: sinon.stub()}}
            }

            fsstub.readFileSync.callsFake((location) => {
                if (location.indexOf('blu') >= 0) {
                    throw new Error('Baaad file');
                }
                return '';
            });

            const BackupCommand = proxyquire(modulePath, {
                'klaw-sync': walkerStub,
                'fs-extra': fsstub
            });
            const backup = new BackupCommand();

            return backup.backupContent(context).then(() => {
                cwdStub.restore();
                expect(context.instance.ui.log.calledOnce).to.be.true;
                expect(context.zipFile.addFile.calledTwice).to.be.true;
            });
        });
    });

    describe('Extension Backups', function () {
        it('Hooks are properly called', function () {
            const files = {
                '/var/www/ghost/system/files/test.conf': '[test]',
                '/var/www/ghost/system/files/test-ssl.conf': '[test-ssl]',
                '/var/www/ghost/system/files/test.service': '[service]'
            };

            const fileStore = {};
            const readStub = sinon.stub().callsFake((location) => files[location]);
            const addFileStub = sinon.stub().callsFake((location, contents) => fileStore[location] = contents);
            const Backup = proxyquire(modulePath, {'fs-extra': {readFileSync: readStub}});

            const hook1 = [{
                fileName: 'process.service',
                location: '/var/www/ghost/system/files/test.service'
            }];

            const hook2 = [{
                fileName: 'route.conf',
                location: '/var/www/ghost/system/files/test.conf'
            }, {
                fileName: 'route-ssl.conf',
                location: '/var/www/ghost/system/files/test-ssl.conf'
            }];

            // First is one file, second doesn't support, third is two files
            const hookStub = sinon.stub().callsFake(function checkName(name) {
                if (name === 'backup') {
                    return Promise.resolve([hook1, undefined, hook2]);
                } else {
                    return Promise.reject('Expected backup hook to be called');
                }
            });
            const BackupCmd = new Backup();

            const ctx = {
                hook: hookStub,
                zipFile: {addFile: addFileStub}
            };

            return BackupCmd.backupExtensions(ctx).then(function () {
                const expectedFileStore = {
                    'extension/process.service': '[service]',
                    'extension/route.conf': '[test]',
                    'extension/route-ssl.conf': '[test-ssl]'
                };
                expect(addFileStub.calledThrice).to.be.true;
                expect(readStub.calledThrice).to.be.true;
                expect(hookStub.calledOnce).to.be.true;
                expect(expectedFileStore).to.deep.equal(fileStore);
            });
        });

        it('Properly warns when a file isn\'t added', function () {
            const files = {'/var/www/ghost/system/files/test.service': '[service]'};
            const fileStore = {};
            const readStub = sinon.stub().callsFake(function getFile(location) {
                if (files[location] !== undefined) {
                    return files[location];
                } else {
                    throw new Error('This file is not supposed to exist');
                }
            });
            const addFileStub = sinon.stub().callsFake((location, contents) => fileStore[location] = contents);
            const Backup = proxyquire(modulePath, {'fs-extra': {readFileSync: readStub}});

            const hook1 = [{
                fileName: 'process.service',
                location: '/var/www/ghost/system/files/test.service'
            }];

            const hook2 = [{
                fileName: 'route.conf',
                location: '/var/www/ghost/system/files/test.conf'
            }];

            const hook3 = [{
                fileName: 'route-ssl.conf',
                location: '/var/www/ghost/system/files/test-ssl.conf',
                description: 'SSL config'
            }];

            const hookStub = sinon.stub().callsFake(function checkName(name) {
                if (name === 'backup') {
                    return Promise.resolve([hook1, undefined, hook2, hook3]);
                } else {
                    return Promise.reject('Expected backup hook to be called');
                }
            });
            const BackupCmd = new Backup();

            const ctx = {
                hook: hookStub,
                zipFile: {addFile: addFileStub},
                ui: {log: sinon.stub()}
            };

            return BackupCmd.backupExtensions(ctx).then(function () {
                const expectedFileStore = {'extension/process.service': '[service]'};
                expect(addFileStub.calledOnce).to.be.true;
                expect(readStub.calledThrice).to.be.true;
                expect(hookStub.calledOnce).to.be.true;
                expect(expectedFileStore).to.deep.equal(fileStore);
                expect(ctx.ui.log.calledTwice).to.be.true;
                expect(ctx.ui.log.getCall(0).args[0]).to.equal('Not backing up "/var/www/ghost/system/files/test.conf" - This file is not supposed to exist');
                expect(ctx.ui.log.getCall(1).args[0]).to.equal('Not backing up "SSL config" - This file is not supposed to exist');
            });
        });
    });
});
