'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noPreserveCache();
const Promise = require('bluebird');
const {setupTestFolder, cleanupTestFolders} = require('../../utils/test-folder');
const path = require('path');
const fs = require('fs');
const {Observable, isObservable} = require('rxjs');

const modulePath = '../../../lib/tasks/install-dependencies';
const errors = require('../../../lib/errors');

// Save the fs-extra cache entry so noPreserveCache doesn't corrupt it for other test files
const fsExtraResolved = require.resolve('fs-extra');
const fsExtraCacheEntry = require.cache[fsExtraResolved];

describe('Unit: Tasks > install-dependencies', function () {
    let originalEnv;

    beforeEach(() => {
        originalEnv = process.env;
        process.env = {};
    });

    afterEach(() => {
        process.env = originalEnv;
        sinon.restore();
        // Restore fs-extra cache entry that noPreserveCache may have evicted
        if (fsExtraCacheEntry) {
            require.cache[fsExtraResolved] = fsExtraCacheEntry;
        }
    });

    after(() => {
        cleanupTestFolders();
    });

    it('base function calls subtasks and yarn util', function () {
        const yarnStub = sinon.stub().returns(new Observable(o => o.complete()));
        const installDependencies = proxyquire(modulePath, {
            '../utils/yarn': yarnStub
        });
        const subTasks = installDependencies.subTasks;
        const ctx = {installPath: '/var/www/ghost/versions/1.5.0'};
        const listrStub = sinon.stub().callsFake((tasks) => {
            expect(tasks).to.have.length(3);

            return Promise.each(tasks, (task) => {
                const result = task.task(ctx);
                return isObservable(result) ? result.toPromise() : result;
            });
        });

        const distTaskStub = sinon.stub(subTasks, 'dist').resolves();
        const downloadTaskStub = sinon.stub(subTasks, 'download');

        return installDependencies({listr: listrStub}).then(() => {
            expect(listrStub.calledOnce).to.be.true;
            expect(distTaskStub.calledOnce).to.be.true;
            expect(downloadTaskStub.calledOnce).to.be.true;
            expect(yarnStub.calledOnce).to.be.true;
            expect(yarnStub.args[0][0]).to.deep.equal(['install', '--no-emoji', '--no-progress']);
            expect(yarnStub.args[0][1]).to.deep.equal({
                cwd: '/var/www/ghost/versions/1.5.0',
                env: {NODE_ENV: 'production', YARN_IGNORE_PATH: 'true'},
                observe: true,
                verbose: false
            });
        });
    });

    it('base function calls subtasks and yarn util correctly with GHOST_NODE_VERISON_CHECK set', function () {
        const yarnStub = sinon.stub().returns(new Observable(o => o.complete()));
        const installDependencies = proxyquire(modulePath, {
            '../utils/yarn': yarnStub
        });
        const subTasks = installDependencies.subTasks;
        const ctx = {installPath: '/var/www/ghost/versions/1.5.0'};
        const listrStub = sinon.stub().callsFake((tasks) => {
            expect(tasks).to.have.length(3);

            return Promise.each(tasks, (task) => {
                const result = task.task(ctx);
                return isObservable(result) ? result.toPromise() : result;
            });
        });

        const distTaskStub = sinon.stub(subTasks, 'dist').resolves();
        const downloadTaskStub = sinon.stub(subTasks, 'download');

        process.env.GHOST_NODE_VERSION_CHECK = 'false';

        return installDependencies({listr: listrStub}).then(() => {
            expect(listrStub.calledOnce).to.be.true;
            expect(distTaskStub.calledOnce).to.be.true;
            expect(downloadTaskStub.calledOnce).to.be.true;
            expect(yarnStub.calledOnce).to.be.true;
            expect(yarnStub.args[0][0]).to.deep.equal(['install', '--no-emoji', '--no-progress', '--ignore-engines']);
            expect(yarnStub.args[0][1]).to.deep.equal({
                cwd: '/var/www/ghost/versions/1.5.0',
                env: {NODE_ENV: 'production', YARN_IGNORE_PATH: 'true'},
                observe: true,
                verbose: false
            });
        });
    });

    it('base function can take zip file', function () {
        const decompressStub = sinon.stub().resolves();
        const listrStub = sinon.stub().resolves();
        const installDependencies = proxyquire(modulePath, {
            decompress: decompressStub
        });

        return installDependencies({listr: listrStub}, 'test.zip').then(() => {
            const ctx = {installPath: '/var/www/ghost'};
            expect(listrStub.calledOnce).to.be.true;

            const tasks = listrStub.args[0][0];
            expect(tasks).to.have.length(2);

            tasks[0].task(ctx);

            expect(decompressStub.called).to.be.true;
            expect(decompressStub.calledWith('test.zip','/var/www/ghost')).to.be.true;
        });
    });

    it('uses pnpm when pnpm-lock.yaml exists in installPath', function () {
        const yarnStub = sinon.stub().returns(new Observable(o => o.complete()));
        const pnpmStub = sinon.stub().returns(new Observable(o => o.complete()));
        const existsSyncStub = sinon.stub();
        existsSyncStub.withArgs(path.join('/var/www/ghost/versions/1.5.0', 'pnpm-lock.yaml')).returns(true);
        existsSyncStub.returns(true);
        const installDependencies = proxyquire(modulePath, {
            '../utils/yarn': yarnStub,
            '../utils/pnpm': pnpmStub,
            'fs-extra': {existsSync: existsSyncStub, removeSync: sinon.stub(), ensureDirSync: sinon.stub(), '@noCallThru': true}
        });
        const subTasks = installDependencies.subTasks;
        const ctx = {installPath: '/var/www/ghost/versions/1.5.0'};
        const listrStub = sinon.stub().callsFake((tasks) => {
            expect(tasks).to.have.length(3);

            return Promise.each(tasks, (task) => {
                const result = task.task(ctx);
                return isObservable(result) ? result.toPromise() : result;
            });
        });

        const distTaskStub = sinon.stub(subTasks, 'dist').resolves();
        const downloadTaskStub = sinon.stub(subTasks, 'download');

        return installDependencies({listr: listrStub}).then(() => {
            expect(listrStub.calledOnce).to.be.true;
            expect(distTaskStub.calledOnce).to.be.true;
            expect(downloadTaskStub.calledOnce).to.be.true;
            expect(pnpmStub.calledOnce).to.be.true;
            expect(yarnStub.called).to.be.false;
            expect(pnpmStub.args[0][0]).to.deep.equal(['install', '--prod', '--reporter=append-only']);
            expect(pnpmStub.args[0][1]).to.deep.equal({
                cwd: '/var/www/ghost/versions/1.5.0',
                env: {NODE_ENV: 'production'},
                observe: true
            });
        });
    });

    it('uses yarn when pnpm-lock.yaml does not exist in installPath', function () {
        const yarnStub = sinon.stub().returns(new Observable(o => o.complete()));
        const pnpmStub = sinon.stub().returns(new Observable(o => o.complete()));
        const existsSyncStub = sinon.stub();
        existsSyncStub.withArgs(path.join('/var/www/ghost/versions/1.5.0', 'pnpm-lock.yaml')).returns(false);
        existsSyncStub.returns(true);
        const installDependencies = proxyquire(modulePath, {
            '../utils/yarn': yarnStub,
            '../utils/pnpm': pnpmStub,
            'fs-extra': {existsSync: existsSyncStub, removeSync: sinon.stub(), ensureDirSync: sinon.stub(), '@noCallThru': true}
        });
        const subTasks = installDependencies.subTasks;
        const ctx = {installPath: '/var/www/ghost/versions/1.5.0'};
        const listrStub = sinon.stub().callsFake((tasks) => {
            expect(tasks).to.have.length(3);

            return Promise.each(tasks, (task) => {
                const result = task.task(ctx);
                return isObservable(result) ? result.toPromise() : result;
            });
        });

        const distTaskStub = sinon.stub(subTasks, 'dist').resolves();
        const downloadTaskStub = sinon.stub(subTasks, 'download');

        return installDependencies({listr: listrStub}).then(() => {
            expect(listrStub.calledOnce).to.be.true;
            expect(distTaskStub.calledOnce).to.be.true;
            expect(downloadTaskStub.calledOnce).to.be.true;
            expect(yarnStub.calledOnce).to.be.true;
            expect(pnpmStub.called).to.be.false;
            expect(yarnStub.args[0][0]).to.deep.equal(['install', '--no-emoji', '--no-progress']);
        });
    });

    it('passes correct env for pnpm (no YARN_IGNORE_PATH)', function () {
        const yarnStub = sinon.stub().returns(new Observable(o => o.complete()));
        const pnpmStub = sinon.stub().returns(new Observable(o => o.complete()));
        const existsSyncStub = sinon.stub();
        existsSyncStub.withArgs(path.join('/var/www/ghost/versions/1.5.0', 'pnpm-lock.yaml')).returns(true);
        existsSyncStub.returns(true);
        const installDependencies = proxyquire(modulePath, {
            '../utils/yarn': yarnStub,
            '../utils/pnpm': pnpmStub,
            'fs-extra': {existsSync: existsSyncStub, removeSync: sinon.stub(), ensureDirSync: sinon.stub(), '@noCallThru': true}
        });
        const subTasks = installDependencies.subTasks;
        const ctx = {installPath: '/var/www/ghost/versions/1.5.0'};
        const listrStub = sinon.stub().callsFake((tasks) => {
            expect(tasks).to.have.length(3);

            return Promise.each(tasks, (task) => {
                const result = task.task(ctx);
                return isObservable(result) ? result.toPromise() : result;
            });
        });

        sinon.stub(subTasks, 'dist').resolves();
        sinon.stub(subTasks, 'download');

        return installDependencies({listr: listrStub}).then(() => {
            const pnpmOpts = pnpmStub.args[0][1];
            expect(pnpmOpts.env).to.deep.equal({NODE_ENV: 'production'});
            expect(pnpmOpts.env).to.not.have.property('YARN_IGNORE_PATH');
        });
    });

    it('cleans up installPath on pnpm error', function () {
        const pnpmStub = sinon.stub().returns(new Observable(o => o.error(new Error('pnpm failed'))));
        const existsSyncStub = sinon.stub().returns(true);
        const removeSyncStub = sinon.stub();
        const installDependencies = proxyquire(modulePath, {
            '../utils/yarn': sinon.stub(),
            '../utils/pnpm': pnpmStub,
            'fs-extra': {existsSync: existsSyncStub, removeSync: removeSyncStub, ensureDirSync: sinon.stub(), '@noCallThru': true}
        });
        const subTasks = installDependencies.subTasks;
        const ctx = {installPath: '/var/www/ghost/versions/1.5.0'};
        const listrStub = sinon.stub().callsFake((tasks) => {
            expect(tasks).to.have.length(3);

            return Promise.each(tasks, (task) => {
                const result = task.task(ctx);
                return isObservable(result) ? result.toPromise() : result;
            });
        });

        sinon.stub(subTasks, 'dist').resolves();
        sinon.stub(subTasks, 'download');

        return installDependencies({listr: listrStub}).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error.message).to.equal('pnpm failed');
            expect(pnpmStub.calledOnce).to.be.true;
            expect(removeSyncStub.calledWith('/var/www/ghost/versions/1.5.0')).to.be.true;
        });
    });

    it('catches errors from yarn and cleans up install folder', function () {
        const yarnStub = sinon.stub().returns(new Observable(o => o.error(new Error('an error occurred'))));
        const installDependencies = proxyquire(modulePath, {
            '../utils/yarn': yarnStub
        });
        const subTasks = installDependencies.subTasks;
        const env = setupTestFolder();
        const ctx = {installPath: env.dir};
        const listrStub = sinon.stub().callsFake((tasks) => {
            expect(tasks).to.have.length(3);

            return Promise.each(tasks, (task) => {
                const result = task.task(ctx);
                return isObservable(result) ? result.toPromise() : result;
            });
        });

        const distTaskStub = sinon.stub(subTasks, 'dist').resolves();
        const downloadTaskStub = sinon.stub(subTasks, 'download');

        return installDependencies({listr: listrStub, verbose: true}).then(() => {
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
                env: {NODE_ENV: 'production', YARN_IGNORE_PATH: 'true'},
                observe: true,
                verbose: true
            });
            expect(fs.existsSync(env.dir)).to.be.false;
        });
    });

    describe('dist subtask', function () {
        it('rejects if Ghost version isn\'t compatible with the current Node version and GHOST_NODE_VERISON_CHECK is not set', function () {
            const data = {
                engines: {node: '^0.10.0'},
                dist: {shasum: 'asdf1234', tarball: 'something.tgz'}
            };
            const infoStub = sinon.stub().resolves(data);
            const dist = proxyquire(modulePath, {
                'package-json': infoStub
            }).subTasks.dist;
            const ctx = {version: '1.5.0', agent: false};

            return dist(ctx).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.SystemError);
                expect(error.message).to.equal(`Ghost v1.5.0 is not compatible with the current Node version. Your node version is ${process.versions.node}, but Ghost v1.5.0 requires ^0.10.0`);
                expect(infoStub.calledOnce).to.be.true;
                expect(infoStub.calledWithExactly('ghost', {version: '1.5.0', agent: false})).to.be.true;
            });
        });

        it('resolves if Ghost version isn\'t compatible with the current Node version and GHOST_NODE_VERISON_CHECK is set', function () {
            const data = {
                engines: {node: '^0.10.0'},
                dist: {shasum: 'asdf1234', tarball: 'something.tgz'}
            };
            const infoStub = sinon.stub().resolves(data);
            const dist = proxyquire(modulePath, {
                'package-json': infoStub
            }).subTasks.dist;
            const ctx = {version: '1.5.0', agent: false};
            process.env.GHOST_NODE_VERSION_CHECK = 'false';

            return dist(ctx).then(() => {
                delete process.env.GHOST_NODE_VERSION_CHECK;
                expect(infoStub.calledOnce).to.be.true;
                expect(infoStub.calledWithExactly('ghost', {version: '1.5.0', agent: false})).to.be.true;
                expect(ctx).to.deep.equal({
                    agent: false,
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
                engines: {node: process.versions.node, cli: '^0.0.1'},
                dist: {shasum: 'asdf1234', tarball: 'something.tgz'}
            };
            const infoStub = sinon.stub().resolves(data);
            const dist = proxyquire(modulePath, {
                'package-json': infoStub,
                '../../package.json': {version: '1.0.0'}
            }).subTasks.dist;
            const ctx = {version: '1.5.0', agent: false};

            return dist(ctx).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.SystemError);
                expect(error.message).to.equal(`Ghost v1.5.0 is not compatible with this version of the CLI. Your CLI version is 1.0.0, but Ghost v1.5.0 requires ^0.0.1`);
                expect(infoStub.calledOnce).to.be.true;
                expect(infoStub.calledWithExactly('ghost', {version: '1.5.0', agent: false})).to.be.true;
            });
        });

        it('resolves if Ghost version isn\'t compatible with CLI version, but CLI is a prerelease version', function () {
            const data = {
                engines: {node: process.versions.node, cli: '^1.9.0'},
                dist: {shasum: 'asdf1234', tarball: 'something.tgz'}
            };
            const infoStub = sinon.stub().resolves(data);
            const dist = proxyquire(modulePath, {
                'package-json': infoStub,
                '../../package.json': {version: '1.10.0-beta.0'}
            }).subTasks.dist;
            const ctx = {version: '1.5.0', agent: false};

            return dist(ctx).then(() => {
                expect(infoStub.calledOnce).to.be.true;
                expect(infoStub.calledWithExactly('ghost', {version: '1.5.0', agent: false})).to.be.true;
                expect(ctx).to.deep.equal({
                    agent: false,
                    version: '1.5.0',
                    shasum: 'asdf1234',
                    tarball: 'something.tgz'
                });
            });
        });

        it('adds shasum and tarball values to context', function () {
            const data = {dist: {shasum: 'asdf1234', tarball: 'something.tgz'}};
            const infoStub = sinon.stub().resolves(data);
            const dist = proxyquire(modulePath, {
                'package-json': infoStub
            }).subTasks.dist;
            const ctx = {version: '1.5.0', agent: false};

            return dist(ctx).then(() => {
                expect(infoStub.calledOnce).to.be.true;
                expect(infoStub.calledWithExactly('ghost', {version: '1.5.0', agent: false})).to.be.true;
                expect(ctx).to.deep.equal({
                    agent: false,
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
