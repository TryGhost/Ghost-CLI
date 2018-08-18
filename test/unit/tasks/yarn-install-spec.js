'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const Promise = require('bluebird');
const {setupTestFolder, cleanupTestFolders} = require('../../utils/test-folder');
const path = require('path');
const fs = require('fs');

const modulePath = '../../../lib/tasks/yarn-install';
const errors = require('../../../lib/errors');

describe('Unit: Tasks > yarn-install', function () {
    after(() => {
        cleanupTestFolders();
    });

    it('base function calls subtasks and yarn util', function () {
        const yarnStub = sinon.stub().resolves();
        const yarnInstall = proxyquire(modulePath, {
            '../utils/yarn': yarnStub
        });
        const subTasks = yarnInstall.subTasks;
        const ctx = {installPath: '/var/www/ghost/versions/1.5.0'};
        const listrStub = sinon.stub().callsFake((tasks) => {
            expect(tasks).to.have.length(3);

            return Promise.each(tasks, task => task.task(ctx));
        });

        const distTaskStub = sinon.stub(subTasks, 'dist').resolves();
        const downloadTaskStub = sinon.stub(subTasks, 'download');

        return yarnInstall({listr: listrStub}).then(() => {
            expect(listrStub.calledOnce).to.be.true;
            expect(distTaskStub.calledOnce).to.be.true;
            expect(downloadTaskStub.calledOnce).to.be.true;
            expect(yarnStub.calledOnce).to.be.true;
            expect(yarnStub.args[0][0]).to.deep.equal(['install', '--no-emoji', '--no-progress']);
            expect(yarnStub.args[0][1]).to.deep.equal({
                cwd: '/var/www/ghost/versions/1.5.0',
                env: {NODE_ENV: 'production'},
                observe: true
            });
        });
    });

    it('base function can take zip file', function () {
        const decompressStub = sinon.stub().resolves();
        const listrStub = sinon.stub().resolves();
        const yarnInstall = proxyquire(modulePath, {
            decompress: decompressStub
        });

        return yarnInstall({listr: listrStub}, 'test.zip').then(() => {
            const ctx = {installPath: '/var/www/ghost'};
            expect(listrStub.calledOnce).to.be.true;

            const tasks = listrStub.args[0][0];
            expect(tasks).to.have.length(2);

            tasks[0].task(ctx);

            expect(decompressStub.called).to.be.true;
            expect(decompressStub.calledWithExactly('test.zip','/var/www/ghost')).to.be.true;
        });
    });

    it('catches errors from yarn and cleans up install folder', function () {
        const yarnStub = sinon.stub().rejects(new Error('an error occurred'));
        const yarnInstall = proxyquire(modulePath, {
            '../utils/yarn': yarnStub
        });
        const subTasks = yarnInstall.subTasks;
        const env = setupTestFolder();
        const ctx = {installPath: env.dir};
        const listrStub = sinon.stub().callsFake((tasks) => {
            expect(tasks).to.have.length(3);

            return Promise.each(tasks, task => task.task(ctx));
        });

        const distTaskStub = sinon.stub(subTasks, 'dist').resolves();
        const downloadTaskStub = sinon.stub(subTasks, 'download');

        return yarnInstall({listr: listrStub}).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error.message).to.equal('an error occurred');
            expect(listrStub.calledOnce).to.be.true;
            expect(distTaskStub.calledOnce).to.be.true;
            expect(downloadTaskStub.calledOnce).to.be.true;
            expect(yarnStub.calledOnce).to.be.true;
            expect(yarnStub.args[0][0]).to.deep.equal(['install', '--no-emoji', '--no-progress']);
            expect(yarnStub.args[0][1]).to.deep.equal({
                cwd: env.dir,
                env: {NODE_ENV: 'production'},
                observe: true
            });
            expect(fs.existsSync(env.dir)).to.be.false;
        });
    });

    describe('dist subtask', function () {
        it('rejects if yarn util returns invalid json', function () {
            const yarnStub = sinon.stub().resolves({stdout: 'not json'});
            const dist = proxyquire(modulePath, {
                '../utils/yarn': yarnStub
            }).subTasks.dist;

            return dist({version: '1.5.0'}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.CliError);
                expect(error.message).to.match(/download information could not be read/);
                expect(yarnStub.calledOnce).to.be.true;
                expect(yarnStub.calledWithExactly(['info', 'ghost@1.5.0', '--json'])).to.be.true;
            });
        });

        it('rejects if dist data could not be found', function () {
            const yarnStub = sinon.stub().resolves({stdout: '{}'});
            const dist = proxyquire(modulePath, {
                '../utils/yarn': yarnStub
            }).subTasks.dist;

            return dist({version: '1.5.0'}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.CliError);
                expect(error.message).to.match(/download information could not be read/);
                expect(yarnStub.calledOnce).to.be.true;
                expect(yarnStub.calledWithExactly(['info', 'ghost@1.5.0', '--json'])).to.be.true;
            });
        });

        it('rejects if Ghost version isn\'t compatible with the current Node version and GHOST_NODE_VERISON_CHECK is not set', function () {
            const data = {
                data: {
                    engines: {node: '^0.10.0'},
                    dist: {shasum: 'asdf1234', tarball: 'something.tgz'}
                }
            };
            const yarnStub = sinon.stub().resolves({stdout: JSON.stringify(data)});
            const dist = proxyquire(modulePath, {
                '../utils/yarn': yarnStub
            }).subTasks.dist;
            const ctx = {version: '1.5.0'};

            return dist(ctx).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.SystemError);
                expect(error.message).to.equal('Ghost v1.5.0 is not compatible with the current Node version.');
                expect(yarnStub.calledOnce).to.be.true;
                expect(yarnStub.calledWithExactly(['info', 'ghost@1.5.0', '--json'])).to.be.true;
            });
        });

        it('resolves if Ghost version isn\'t compatible with the current Node version and GHOST_NODE_VERISON_CHECK is set', function () {
            const data = {
                data: {
                    engines: {node: '^0.10.0'},
                    dist: {shasum: 'asdf1234', tarball: 'something.tgz'}
                }
            };
            const yarnStub = sinon.stub().resolves({stdout: JSON.stringify(data)});
            const dist = proxyquire(modulePath, {
                '../utils/yarn': yarnStub
            }).subTasks.dist;
            const ctx = {version: '1.5.0'};
            process.env.GHOST_NODE_VERSION_CHECK = 'false';

            return dist(ctx).then(() => {
                delete process.env.GHOST_NODE_VERSION_CHECK;
                expect(yarnStub.calledOnce).to.be.true;
                expect(yarnStub.calledWithExactly(['info', 'ghost@1.5.0', '--json'])).to.be.true;
                expect(ctx).to.deep.equal({
                    version: '1.5.0',
                    shasum: 'asdf1234',
                    tarball: 'something.tgz'
                });
            }).catch((error) => {
                delete process.env.GHOST_NODE_VERSION_CHECK;
                return Promise.reject(error);
            });
        });

        it('rejects if Ghost version isn\'t compatible with the current CLI version', function () {
            const data = {
                data: {
                    engines: {node: process.versions.node, cli: '^0.0.1'},
                    dist: {shasum: 'asdf1234', tarball: 'something.tgz'}
                }
            };
            const yarnStub = sinon.stub().resolves({stdout: JSON.stringify(data)});
            const dist = proxyquire(modulePath, {
                '../utils/yarn': yarnStub
            }).subTasks.dist;
            const ctx = {version: '1.5.0'};

            return dist(ctx).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.SystemError);
                expect(error.message).to.equal('Ghost v1.5.0 is not compatible with this version of the CLI.');
                expect(yarnStub.calledOnce).to.be.true;
                expect(yarnStub.calledWithExactly(['info', 'ghost@1.5.0', '--json'])).to.be.true;
            });
        });

        it('adds shasum and tarball values to context', function () {
            const data = {data: {dist: {shasum: 'asdf1234', tarball: 'something.tgz'}}};
            const yarnStub = sinon.stub().resolves({stdout: JSON.stringify(data)});
            const dist = proxyquire(modulePath, {
                '../utils/yarn': yarnStub
            }).subTasks.dist;
            const ctx = {version: '1.5.0'};

            return dist(ctx).then(() => {
                expect(yarnStub.calledOnce).to.be.true;
                expect(yarnStub.calledWithExactly(['info', 'ghost@1.5.0', '--json'])).to.be.true;
                expect(ctx).to.deep.equal({
                    version: '1.5.0',
                    shasum: 'asdf1234',
                    tarball: 'something.tgz'
                });
            });
        });
    });

    describe('download subtask', function () {
        it('rejects if shasum does not match the sha hash of the downloaded data', function () {
            const downloadStub = sinon.stub().resolves({downloadedData: true});
            const shasumStub = sinon.stub().returns('badshasum');
            const downloadTask = proxyquire(modulePath, {
                download: downloadStub,
                shasum: shasumStub
            }).subTasks.download;
            const ctx = {
                tarball: 'something.tgz',
                shasum: 'asdf1234'
            };

            return downloadTask(ctx).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.CliError);
                expect(error.message).to.match(/download integrity compromised/);
                expect(downloadStub.calledOnce).to.be.true;
                expect(downloadStub.calledWithExactly('something.tgz'));
                expect(shasumStub.calledOnce).to.be.true;
                expect(shasumStub.calledWithExactly({downloadedData: true})).to.be.true;
            });
        });

        it('creates dir, decompresses and maps files', function () {
            const env = setupTestFolder();
            const downloadStub = sinon.stub().resolves({downloadedData: true});
            const shasumStub = sinon.stub().returns('asdf1234');
            const decompressStub = sinon.stub().resolves();
            const downloadTask = proxyquire(modulePath, {
                download: downloadStub,
                shasum: shasumStub,
                decompress: decompressStub
            }).subTasks.download;
            const ctx = {
                tarball: 'something.tgz',
                shasum: 'asdf1234',
                installPath: path.join(env.dir, 'versions/1.0.0')
            };

            return downloadTask(ctx).then(() => {
                expect(downloadStub.calledOnce).to.be.true;
                expect(downloadStub.calledOnce).to.be.true;
                expect(downloadStub.calledWithExactly('something.tgz'));
                expect(shasumStub.calledOnce).to.be.true;
                expect(shasumStub.calledWithExactly({downloadedData: true})).to.be.true;
                expect(decompressStub.calledOnce).to.be.true;
                expect(fs.existsSync(ctx.installPath)).to.be.true;

                expect(decompressStub.args[0][0]).to.deep.equal({downloadedData: true});
                expect(decompressStub.args[0][1]).to.equal(ctx.installPath);
                expect(decompressStub.args[0][2].map).to.exist;

                const files = [{path: 'package/index.js'}, {path: 'package/package.json'}, {path: 'package/yarn.lock'}];
                const mapResult = files.map(decompressStub.args[0][2].map);
                expect(mapResult).to.deep.equal([{path: 'index.js'}, {path: 'package.json'}, {path: 'yarn.lock'}]);
            });
        });

        it('catches errors from decompress and cleans up the install folder', function () {
            const env = setupTestFolder();
            const downloadStub = sinon.stub().resolves({downloadedData: true});
            const shasumStub = sinon.stub().returns('asdf1234');
            const decompressStub = sinon.stub().rejects(new Error('an error occurred'));
            const downloadTask = proxyquire(modulePath, {
                download: downloadStub,
                shasum: shasumStub,
                decompress: decompressStub
            }).subTasks.download;
            const ctx = {
                tarball: 'something.tgz',
                shasum: 'asdf1234',
                installPath: path.join(env.dir, 'versions/1.0.0')
            };

            return downloadTask(ctx).then(() => {
                expect(false, 'Error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error.message).to.equal('an error occurred');
                expect(downloadStub.calledOnce).to.be.true;
                expect(downloadStub.calledWithExactly('something.tgz'));
                expect(shasumStub.calledOnce).to.be.true;
                expect(shasumStub.calledWithExactly({downloadedData: true})).to.be.true;
                expect(decompressStub.calledOnce).to.be.true;
                expect(fs.existsSync(ctx.installPath)).to.be.false;
            });
        });
    });
});
