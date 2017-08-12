'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const Promise = require('bluebird');
const setupEnv = require('../../utils/env');
const path = require('path');
const fs = require('fs');

const modulePath = '../../../lib/tasks/yarn-install';
const errors = require('../../../lib/errors');

describe('Unit: Tasks > yarn-install', function () {
    it('base function calls subtasks and yarn util', function () {
        const yarnStub = sinon.stub().resolves();
        const yarnInstall = proxyquire(modulePath, {
            '../utils/yarn': yarnStub
        });
        const subTasks = yarnInstall.subTasks;
        const ctx = {installPath: '/var/www/ghost/versions/1.5.0'};
        const listrStub = sinon.stub().callsFake((tasks) => {
            expect(tasks).to.have.length(3);

            return Promise.each(tasks, (task) => task.task(ctx));
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
                expect(yarnStub.calledWithExactly(['info', 'ghost@1.5.0', 'dist', '--json'])).to.be.true;
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
                expect(yarnStub.calledWithExactly(['info', 'ghost@1.5.0', 'dist', '--json'])).to.be.true;
            });
        });

        it('adds shasum and tarball values to context', function () {
            const data = {data: {shasum: 'asdf1234', tarball: 'something.tgz'}};
            const yarnStub = sinon.stub().resolves({stdout: JSON.stringify(data)});
            const dist = proxyquire(modulePath, {
                '../utils/yarn': yarnStub
            }).subTasks.dist;
            const ctx = {version: '1.5.0'};

            return dist(ctx).then(() => {
                expect(yarnStub.calledOnce).to.be.true;
                expect(yarnStub.calledWithExactly(['info', 'ghost@1.5.0', 'dist', '--json'])).to.be.true;
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
            const env = setupEnv();
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
    });
});
