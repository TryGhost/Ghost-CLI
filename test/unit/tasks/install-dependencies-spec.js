'use strict';
const sinon = require('sinon');
const proxyquire = require('proxyquire').noPreserveCache();
const each = require('../../utils/each');
const {setupTestFolder, cleanupTestFolders} = require('../../utils/test-folder');
const path = require('path');
const fs = require('fs');
const {getReadableStream, erroringStream, collect, isReadable} = require('../../utils/stream');

const modulePath = '../../../lib/tasks/install-dependencies';
const errors = require('../../../lib/errors');

describe('Unit: Tasks > install-dependencies', function () {
    let originalEnv;

    beforeEach(() => {
        originalEnv = process.env;
        process.env = {};
    });

    afterEach(() => {
        process.env = originalEnv;
        sinon.restore();
    });

    afterAll(() => {
        cleanupTestFolders();
    });

    it('base function calls subtasks and yarn util', function () {
        const yarnStub = sinon.stub().returns(getReadableStream());
        const installDependencies = proxyquire(modulePath, {
            '../utils/yarn': yarnStub
        });
        const subTasks = installDependencies.subTasks;
        const ctx = {installPath: '/var/www/ghost/versions/1.5.0'};
        const listrStub = sinon.stub().callsFake((tasks) => {
            expect(tasks).to.have.length(3);

            return each(tasks, (task) => {
                const result = task.task(ctx);
                return isReadable(result) ? collect(result) : result;
            });
        });

        const compatTaskStub = sinon.stub(subTasks, 'compatibility').resolves();
        const downloadTaskStub = sinon.stub(subTasks, 'download');

        return installDependencies({listr: listrStub}).then(() => {
            expect(listrStub.calledOnce).to.be.true;
            expect(compatTaskStub.calledOnce).to.be.true;
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
        const yarnStub = sinon.stub().returns(getReadableStream());
        const installDependencies = proxyquire(modulePath, {
            '../utils/yarn': yarnStub
        });
        const subTasks = installDependencies.subTasks;
        const ctx = {installPath: '/var/www/ghost/versions/1.5.0'};
        const listrStub = sinon.stub().callsFake((tasks) => {
            expect(tasks).to.have.length(3);

            return each(tasks, (task) => {
                const result = task.task(ctx);
                return isReadable(result) ? collect(result) : result;
            });
        });

        const compatTaskStub = sinon.stub(subTasks, 'compatibility').resolves();
        const downloadTaskStub = sinon.stub(subTasks, 'download');

        process.env.GHOST_NODE_VERSION_CHECK = 'false';

        return installDependencies({listr: listrStub}).then(() => {
            expect(listrStub.calledOnce).to.be.true;
            expect(compatTaskStub.calledOnce).to.be.true;
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
        const extractStub = sinon.stub().resolves();
        const listrStub = sinon.stub().resolves();
        const installDependencies = proxyquire(modulePath, {
            '../utils/archive': {extract: extractStub}
        });

        return installDependencies({listr: listrStub}, 'test.zip').then(() => {
            const ctx = {installPath: '/var/www/ghost'};
            expect(listrStub.calledOnce).to.be.true;

            const tasks = listrStub.args[0][0];
            expect(tasks).to.have.length(2);

            tasks[0].task(ctx);

            expect(extractStub.calledOnce).to.be.true;
            expect(extractStub.calledWithExactly('test.zip', '/var/www/ghost')).to.be.true;
        });
    });

    it('cleans up the install folder if the local archive fails to extract', function () {
        const env = setupTestFolder();
        const extractStub = sinon.stub().rejects(new Error('bad archive'));
        const listrStub = sinon.stub().resolves();
        const installDependencies = proxyquire(modulePath, {
            '../utils/archive': {extract: extractStub}
        });
        const ctx = {installPath: path.join(env.dir, 'versions/1.0.0')};

        fs.mkdirSync(ctx.installPath, {recursive: true});

        return installDependencies({listr: listrStub}, 'test.zip').then(() => {
            const tasks = listrStub.args[0][0];

            return tasks[0].task(ctx).then(() => {
                expect(false, 'Error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error.message).to.equal('bad archive');
                expect(extractStub.calledOnce).to.be.true;
                expect(fs.existsSync(ctx.installPath)).to.be.false;
            });
        });
    });

    it('uses pnpm when pnpm-lock.yaml exists in installPath', function () {
        const yarnStub = sinon.stub().returns(getReadableStream());
        const pnpmStub = sinon.stub().returns(getReadableStream());
        const existsSyncStub = sinon.stub();
        existsSyncStub.withArgs(path.join('/var/www/ghost/versions/1.5.0', 'pnpm-lock.yaml')).returns(true);
        existsSyncStub.returns(true);
        const installDependencies = proxyquire(modulePath, {
            '../utils/yarn': yarnStub,
            '../utils/pnpm': pnpmStub,
            'node:fs': {existsSync: existsSyncStub, rmSync: sinon.stub(), mkdtempSync: sinon.stub(), '@noCallThru': true}
        });
        const subTasks = installDependencies.subTasks;
        const ctx = {installPath: '/var/www/ghost/versions/1.5.0'};
        const listrStub = sinon.stub().callsFake((tasks) => {
            expect(tasks).to.have.length(3);

            return each(tasks, (task) => {
                const result = task.task(ctx);
                return isReadable(result) ? collect(result) : result;
            });
        });

        const compatTaskStub = sinon.stub(subTasks, 'compatibility').resolves();
        const downloadTaskStub = sinon.stub(subTasks, 'download');

        return installDependencies({listr: listrStub}).then(() => {
            expect(listrStub.calledOnce).to.be.true;
            expect(compatTaskStub.calledOnce).to.be.true;
            expect(downloadTaskStub.calledOnce).to.be.true;
            expect(pnpmStub.calledOnce).to.be.true;
            expect(yarnStub.called).to.be.false;
            expect(pnpmStub.args[0][0]).to.deep.equal(['install', '--prod', '--store-dir=/var/www/ghost/.pnpm-store', '--reporter=append-only']);
            expect(pnpmStub.args[0][1]).to.deep.equal({
                cwd: '/var/www/ghost/versions/1.5.0',
                env: {NODE_ENV: 'production', COREPACK_DEFAULT_TO_LATEST: '0'},
                observe: true
            });
        });
    });

    it('uses yarn when pnpm-lock.yaml does not exist in installPath', function () {
        const yarnStub = sinon.stub().returns(getReadableStream());
        const pnpmStub = sinon.stub().returns(getReadableStream());
        const existsSyncStub = sinon.stub();
        existsSyncStub.withArgs(path.join('/var/www/ghost/versions/1.5.0', 'pnpm-lock.yaml')).returns(false);
        existsSyncStub.returns(true);
        const installDependencies = proxyquire(modulePath, {
            '../utils/yarn': yarnStub,
            '../utils/pnpm': pnpmStub,
            'node:fs': {existsSync: existsSyncStub, rmSync: sinon.stub(), mkdtempSync: sinon.stub(), '@noCallThru': true}
        });
        const subTasks = installDependencies.subTasks;
        const ctx = {installPath: '/var/www/ghost/versions/1.5.0'};
        const listrStub = sinon.stub().callsFake((tasks) => {
            expect(tasks).to.have.length(3);

            return each(tasks, (task) => {
                const result = task.task(ctx);
                return isReadable(result) ? collect(result) : result;
            });
        });

        const compatTaskStub = sinon.stub(subTasks, 'compatibility').resolves();
        const downloadTaskStub = sinon.stub(subTasks, 'download');

        return installDependencies({listr: listrStub}).then(() => {
            expect(listrStub.calledOnce).to.be.true;
            expect(compatTaskStub.calledOnce).to.be.true;
            expect(downloadTaskStub.calledOnce).to.be.true;
            expect(yarnStub.calledOnce).to.be.true;
            expect(pnpmStub.called).to.be.false;
            expect(yarnStub.args[0][0]).to.deep.equal(['install', '--no-emoji', '--no-progress']);
        });
    });

    it('passes correct env for pnpm (no YARN_IGNORE_PATH)', function () {
        const yarnStub = sinon.stub().returns(getReadableStream());
        const pnpmStub = sinon.stub().returns(getReadableStream());
        const existsSyncStub = sinon.stub();
        existsSyncStub.withArgs(path.join('/var/www/ghost/versions/1.5.0', 'pnpm-lock.yaml')).returns(true);
        existsSyncStub.returns(true);
        const installDependencies = proxyquire(modulePath, {
            '../utils/yarn': yarnStub,
            '../utils/pnpm': pnpmStub,
            'node:fs': {existsSync: existsSyncStub, rmSync: sinon.stub(), mkdtempSync: sinon.stub(), '@noCallThru': true}
        });
        const subTasks = installDependencies.subTasks;
        const ctx = {installPath: '/var/www/ghost/versions/1.5.0'};
        const listrStub = sinon.stub().callsFake((tasks) => {
            expect(tasks).to.have.length(3);

            return each(tasks, (task) => {
                const result = task.task(ctx);
                return isReadable(result) ? collect(result) : result;
            });
        });

        sinon.stub(subTasks, 'compatibility').resolves();
        sinon.stub(subTasks, 'download');

        return installDependencies({listr: listrStub}).then(() => {
            const pnpmOpts = pnpmStub.args[0][1];
            expect(pnpmOpts.env).to.deep.equal({NODE_ENV: 'production', COREPACK_DEFAULT_TO_LATEST: '0'});
            expect(pnpmOpts.env).to.not.have.property('YARN_IGNORE_PATH');
        });
    });

    it('cleans up installPath on pnpm error', function () {
        const pnpmStub = sinon.stub().returns(erroringStream(new Error('pnpm failed')));
        const existsSyncStub = sinon.stub().returns(true);
        const rmSyncStub = sinon.stub();
        const installDependencies = proxyquire(modulePath, {
            '../utils/yarn': sinon.stub(),
            '../utils/pnpm': pnpmStub,
            'node:fs': {existsSync: existsSyncStub, rmSync: rmSyncStub, mkdtempSync: sinon.stub(), '@noCallThru': true}
        });
        const subTasks = installDependencies.subTasks;
        const ctx = {installPath: '/var/www/ghost/versions/1.5.0'};
        const listrStub = sinon.stub().callsFake((tasks) => {
            expect(tasks).to.have.length(3);

            return each(tasks, (task) => {
                const result = task.task(ctx);
                return isReadable(result) ? collect(result) : result;
            });
        });

        sinon.stub(subTasks, 'compatibility').resolves();
        sinon.stub(subTasks, 'download');

        return installDependencies({listr: listrStub}).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error.message).to.equal('pnpm failed');
            expect(pnpmStub.calledOnce).to.be.true;
            expect(rmSyncStub.calledWith('/var/www/ghost/versions/1.5.0', {recursive: true, force: true})).to.be.true;
        });
    });

    it('catches errors from yarn and cleans up install folder', function () {
        const yarnStub = sinon.stub().returns(erroringStream(new Error('an error occurred')));
        const installDependencies = proxyquire(modulePath, {
            '../utils/yarn': yarnStub
        });
        const subTasks = installDependencies.subTasks;
        const env = setupTestFolder();
        const ctx = {installPath: env.dir};
        const listrStub = sinon.stub().callsFake((tasks) => {
            expect(tasks).to.have.length(3);

            return each(tasks, (task) => {
                const result = task.task(ctx);
                return isReadable(result) ? collect(result) : result;
            });
        });

        const compatTaskStub = sinon.stub(subTasks, 'compatibility').resolves();
        const downloadTaskStub = sinon.stub(subTasks, 'download');

        return installDependencies({listr: listrStub, verbose: true}).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error.message).to.equal('an error occurred');
            expect(listrStub.calledOnce).to.be.true;
            expect(compatTaskStub.calledOnce).to.be.true;
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

    describe('compatibility subtask', function () {
        it('rejects if Ghost version isn\'t compatible with the current Node version and GHOST_NODE_VERISON_CHECK is not set', function () {
            const data = {engines: {node: '^0.10.0'}};
            const infoStub = sinon.stub().resolves(data);
            const compatibility = proxyquire(modulePath, {
                'package-json': {default: infoStub}
            }).subTasks.compatibility;
            const ctx = {version: '1.5.0'};

            return compatibility(ctx).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.SystemError);
                expect(error.message).to.equal(`Ghost v1.5.0 is not compatible with the current Node version. Your node version is ${process.versions.node}, but Ghost v1.5.0 requires ^0.10.0`);
                expect(infoStub.calledOnce).to.be.true;
                expect(infoStub.calledWithExactly('ghost', {version: '1.5.0'})).to.be.true;
            });
        });

        it('resolves if Ghost version isn\'t compatible with the current Node version and GHOST_NODE_VERISON_CHECK is set', function () {
            const data = {engines: {node: '^0.10.0'}};
            const infoStub = sinon.stub().resolves(data);
            const compatibility = proxyquire(modulePath, {
                'package-json': {default: infoStub}
            }).subTasks.compatibility;
            const ctx = {version: '1.5.0'};
            process.env.GHOST_NODE_VERSION_CHECK = 'false';

            return compatibility(ctx).then(() => {
                delete process.env.GHOST_NODE_VERSION_CHECK;
                expect(infoStub.calledOnce).to.be.true;
                expect(infoStub.calledWithExactly('ghost', {version: '1.5.0'})).to.be.true;
            }).catch((error) => {
                delete process.env.GHOST_NODE_VERSION_CHECK;
                return Promise.reject(error);
            });
        });

        it('rejects if Ghost version isn\'t compatible with the current CLI version', function () {
            const data = {engines: {node: process.versions.node, cli: '^0.0.1'}};
            const infoStub = sinon.stub().resolves(data);
            const compatibility = proxyquire(modulePath, {
                'package-json': {default: infoStub},
                '../../package.json': {version: '1.0.0'}
            }).subTasks.compatibility;
            const ctx = {version: '1.5.0'};

            return compatibility(ctx).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.SystemError);
                expect(error.message).to.equal(`Ghost v1.5.0 is not compatible with this version of the CLI. Your CLI version is 1.0.0, but Ghost v1.5.0 requires ^0.0.1`);
                expect(infoStub.calledOnce).to.be.true;
                expect(infoStub.calledWithExactly('ghost', {version: '1.5.0'})).to.be.true;
            });
        });

        it('resolves if Ghost version isn\'t compatible with CLI version, but CLI is a prerelease version', function () {
            const data = {engines: {node: process.versions.node, cli: '^1.9.0'}};
            const infoStub = sinon.stub().resolves(data);
            const compatibility = proxyquire(modulePath, {
                'package-json': {default: infoStub},
                '../../package.json': {version: '1.10.0-beta.0'}
            }).subTasks.compatibility;
            const ctx = {version: '1.5.0'};

            return compatibility(ctx).then(() => {
                expect(infoStub.calledOnce).to.be.true;
                expect(infoStub.calledWithExactly('ghost', {version: '1.5.0'})).to.be.true;
            });
        });

        it('resolves if no engines are specified', function () {
            const infoStub = sinon.stub().resolves({});
            const compatibility = proxyquire(modulePath, {
                'package-json': {default: infoStub}
            }).subTasks.compatibility;
            const ctx = {version: '1.5.0'};

            return compatibility(ctx).then(() => {
                expect(infoStub.calledOnce).to.be.true;
                expect(infoStub.calledWithExactly('ghost', {version: '1.5.0'})).to.be.true;
                expect(ctx).to.deep.equal({version: '1.5.0'});
            });
        });
    });

    describe('download subtask', function () {
        const packResult = {stdout: JSON.stringify([{filename: 'ghost-1.0.0.tgz'}])};

        it('packs the requested version and extracts the tarball', function () {
            const env = setupTestFolder();
            const execaStub = sinon.stub().resolves(packResult);
            const extractStub = sinon.stub().resolves();
            const downloadTask = proxyquire(modulePath, {
                execa: {execa: execaStub},
                '../utils/archive': {extract: extractStub}
            }).subTasks.download;
            const ctx = {
                version: '1.0.0',
                installPath: path.join(env.dir, 'versions/1.0.0')
            };

            return downloadTask(ctx).then(() => {
                expect(execaStub.calledOnce).to.be.true;
                expect(execaStub.args[0][0]).to.equal('npm');
                expect(execaStub.args[0][1]).to.deep.equal(['pack', 'ghost@1.0.0', '--json']);

                const tmpDir = execaStub.args[0][2].cwd;
                expect(tmpDir).to.be.a('string');
                expect(fs.existsSync(tmpDir)).to.be.false;

                expect(extractStub.calledOnce).to.be.true;
                expect(extractStub.calledWithExactly(
                    path.join(tmpDir, 'ghost-1.0.0.tgz'),
                    ctx.installPath
                )).to.be.true;
            });
        });

        it('wraps npm pack failures in a ProcessError', function () {
            const env = setupTestFolder();
            const execaStub = sinon.stub().rejects(new Error('npm exploded'));
            const extractStub = sinon.stub().resolves();
            const downloadTask = proxyquire(modulePath, {
                execa: {execa: execaStub},
                '../utils/archive': {extract: extractStub}
            }).subTasks.download;
            const ctx = {
                version: '1.0.0',
                installPath: path.join(env.dir, 'versions/1.0.0')
            };

            return downloadTask(ctx).then(() => {
                expect(false, 'Error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.ProcessError);
                expect(execaStub.calledOnce).to.be.true;
                expect(fs.existsSync(execaStub.args[0][2].cwd)).to.be.false;
                expect(extractStub.called).to.be.false;
                expect(fs.existsSync(ctx.installPath)).to.be.false;
            });
        });

        it('throws a ProcessError when npm pack output is not valid JSON', function () {
            const env = setupTestFolder();
            const execaStub = sinon.stub().resolves({stdout: 'npm notice not json', stderr: 'boom'});
            const extractStub = sinon.stub().resolves();
            const downloadTask = proxyquire(modulePath, {
                execa: {execa: execaStub},
                '../utils/archive': {extract: extractStub}
            }).subTasks.download;
            const ctx = {
                version: '1.0.0',
                installPath: path.join(env.dir, 'versions/1.0.0')
            };

            return downloadTask(ctx).then(() => {
                expect(false, 'Error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.ProcessError);
                expect(error.message).to.contain('Could not parse');
                expect(error.options.stdout).to.equal('npm notice not json');
                expect(error.options.stderr).to.equal('boom');
                expect(extractStub.called).to.be.false;
                expect(fs.existsSync(execaStub.args[0][2].cwd)).to.be.false;
                expect(fs.existsSync(ctx.installPath)).to.be.false;
            });
        });

        it('throws a ProcessError when npm pack returns no tarball', function () {
            const env = setupTestFolder();
            const execaStub = sinon.stub().resolves({stdout: JSON.stringify({error: {code: 'E404'}}), stderr: ''});
            const extractStub = sinon.stub().resolves();
            const downloadTask = proxyquire(modulePath, {
                execa: {execa: execaStub},
                '../utils/archive': {extract: extractStub}
            }).subTasks.download;
            const ctx = {
                version: '1.0.0',
                installPath: path.join(env.dir, 'versions/1.0.0')
            };

            return downloadTask(ctx).then(() => {
                expect(false, 'Error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.ProcessError);
                expect(error.message).to.contain('did not return a tarball');
                expect(error.options.stdout).to.equal(JSON.stringify({error: {code: 'E404'}}));
                expect(extractStub.called).to.be.false;
                expect(fs.existsSync(execaStub.args[0][2].cwd)).to.be.false;
                expect(fs.existsSync(ctx.installPath)).to.be.false;
            });
        });

        it('throws a ProcessError when npm pack returns a non-string filename', function () {
            const env = setupTestFolder();
            const execaStub = sinon.stub().resolves({stdout: JSON.stringify([{filename: 42}]), stderr: ''});
            const extractStub = sinon.stub().resolves();
            const downloadTask = proxyquire(modulePath, {
                execa: {execa: execaStub},
                '../utils/archive': {extract: extractStub}
            }).subTasks.download;
            const ctx = {
                version: '1.0.0',
                installPath: path.join(env.dir, 'versions/1.0.0')
            };

            return downloadTask(ctx).then(() => {
                expect(false, 'Error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.ProcessError);
                expect(error.message).to.contain('did not return a tarball');
                expect(extractStub.called).to.be.false;
                expect(fs.existsSync(execaStub.args[0][2].cwd)).to.be.false;
                expect(fs.existsSync(ctx.installPath)).to.be.false;
            });
        });

        it('catches extraction errors and cleans up the install folder', function () {
            const env = setupTestFolder();
            const execaStub = sinon.stub().resolves(packResult);
            const extractStub = sinon.stub().rejects(new Error('an error occurred'));
            const downloadTask = proxyquire(modulePath, {
                execa: {execa: execaStub},
                '../utils/archive': {extract: extractStub}
            }).subTasks.download;
            const ctx = {
                version: '1.0.0',
                installPath: path.join(env.dir, 'versions/1.0.0')
            };

            return downloadTask(ctx).then(() => {
                expect(false, 'Error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error.message).to.equal('an error occurred');
                expect(execaStub.calledOnce).to.be.true;
                expect(extractStub.calledOnce).to.be.true;
                expect(fs.existsSync(execaStub.args[0][2].cwd)).to.be.false;
                expect(fs.existsSync(ctx.installPath)).to.be.false;
            });
        });
    });
});
