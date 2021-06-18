'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const errors = require('../../../lib/errors');
const EventEmitter = require('events').EventEmitter;

const fs = require('fs-extra');
const childProcess = require('child_process');

const modulePath = '../../../lib/utils/local-process';

describe('Unit: Utils > local-process', function () {
    before(() => {
        process.send = process.send || (() => {});
    });

    afterEach(() => {
        // This is here so we at least have a function to stub out
        sinon.restore();
    });

    it('willRun returns true', function () {
        const LocalProcess = require(modulePath);
        expect(LocalProcess.willRun()).to.be.true;
    });

    it('success works', function () {
        const successStub = sinon.stub(process, 'send');
        const LocalProcess = require(modulePath);

        const instance = new LocalProcess({}, {}, {});
        instance.success();

        expect(successStub.calledOnce).to.be.true;
        expect(successStub.calledWithExactly({started: true})).to.be.true;
    });

    it('error works', function () {
        const errorStub = sinon.stub(process, 'send');
        const LocalProcess = require(modulePath);

        const instance = new LocalProcess({}, {}, {});
        instance.error({message: 'Test Error'});

        expect(errorStub.calledOnce).to.be.true;
        expect(errorStub.calledWithExactly({error: true, message: 'Test Error'})).to.be.true;
    });

    describe('isRunning', function () {
        it('returns false if pidfile doesn\'t exist', function () {
            const existsStub = sinon.stub(fs, 'existsSync').returns(false);
            const LocalProcess = require(modulePath);
            const instance = new LocalProcess({}, {}, {});
            const result = instance.isRunning('/var/www/ghost');

            expect(result).to.be.false;
            expect(existsStub.calledWithExactly('/var/www/ghost/.ghostpid')).to.be.true;
        });

        it('fetches pid from file, removes pidfile and returns false if not running', function () {
            const existsStub = sinon.stub(fs, 'existsSync').returns(true);
            const readFileStub = sinon.stub(fs, 'readFileSync').returns('42');
            const removeStub = sinon.stub(fs, 'removeSync');
            const isRunningStub = sinon.stub().returns(false);

            const LocalProcess = proxyquire(modulePath, {
                'is-running': isRunningStub
            });

            const instance = new LocalProcess({}, {}, {});
            const result = instance.isRunning('/var/www/ghost');

            expect(result).to.be.false;
            expect(existsStub.calledWithExactly('/var/www/ghost/.ghostpid')).to.be.true;
            expect(readFileStub.calledOnce).to.be.true;
            expect(isRunningStub.calledWithExactly(42)).to.be.true;
            expect(removeStub.calledWithExactly('/var/www/ghost/.ghostpid')).to.be.true;
        });

        it('fetches pid from file, returns true if running', function () {
            const existsStub = sinon.stub(fs, 'existsSync').returns(true);
            const readFileStub = sinon.stub(fs, 'readFileSync').returns('42');
            const removeStub = sinon.stub(fs, 'removeSync');
            const isRunningStub = sinon.stub().returns(true);

            const LocalProcess = proxyquire(modulePath, {
                'is-running': isRunningStub
            });

            const instance = new LocalProcess({}, {}, {});
            const result = instance.isRunning('/var/www/ghost');

            expect(result).to.be.true;
            expect(existsStub.calledWithExactly('/var/www/ghost/.ghostpid')).to.be.true;
            expect(readFileStub.calledOnce).to.be.true;
            expect(isRunningStub.calledWithExactly(42)).to.be.true;
            expect(removeStub.called).to.be.false;
        });
    });

    describe('start', function () {
        it('errors if _checkContentFolder returns false', function (done) {
            const LocalProcess = require(modulePath);
            const instance = new LocalProcess({}, {}, {});

            const checkStub = sinon.stub(instance, '_checkContentFolder').returns(false);

            instance.start('/var/www/ghost', 'development').then(() => {
                done(new Error('start should have rejected'));
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.SystemError);
                expect(error.message).to.match(/content folder is not owned by the current user/);
                expect(checkStub.calledWithExactly('/var/www/ghost')).to.be.true;

                done();
            });
        });

        it('writes pid to file, rejects on error event', function (done) {
            const cp = new EventEmitter();
            cp.stderr = {
                on: sinon.stub(),
                destroy: sinon.stub()
            };
            cp.pid = 42;
            const spawnStub = sinon.stub(childProcess, 'spawn').returns(cp);
            const writeFileStub = sinon.stub(fs, 'writeFileSync');

            const LocalProcess = require(modulePath);
            const instance = new LocalProcess({}, {}, {});
            const checkStub = sinon.stub(instance, '_checkContentFolder').returns(true);
            const startPromise = instance.start('/var/www/ghost', 'production');

            expect(checkStub.calledWithExactly('/var/www/ghost')).to.be.true;

            startPromise.then(() => {
                done(new Error('Start should have rejected'));
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.CliError);
                expect(error.message).to.equal('An error occurred while starting Ghost.');
                expect(spawnStub.calledOnce).to.be.true;
                expect(cp.stderr.on.calledOnce).to.be.true;
                expect(writeFileStub.calledWithExactly('/var/www/ghost/.ghostpid', '42')).to.be.true;
                done();
            });

            cp.emit('error', {message: 'something happened'});
        });

        it('writes pid to file, rejects on exit event', function (done) {
            const cp = new EventEmitter();
            cp.stderr = {
                on: sinon.stub(),
                destroy: sinon.stub()
            };
            cp.pid = 42;
            const spawnStub = sinon.stub(childProcess, 'spawn').returns(cp);
            const writeFileStub = sinon.stub(fs, 'writeFileSync');
            const removeStub = sinon.stub(fs, 'removeSync');

            const LocalProcess = require(modulePath);
            const instance = new LocalProcess({}, {}, {});
            const checkStub = sinon.stub(instance, '_checkContentFolder').returns(true);
            const startPromise = instance.start('/var/www/ghost', 'production');

            expect(checkStub.calledWithExactly('/var/www/ghost')).to.be.true;

            startPromise.then(() => {
                done(new Error('Start should have rejected'));
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.GhostError);
                expect(error.message).to.equal('Ghost process exited with code: 1');
                expect(spawnStub.calledOnce).to.be.true;
                expect(cp.stderr.on.calledOnce).to.be.true;
                expect(writeFileStub.calledWithExactly('/var/www/ghost/.ghostpid', '42')).to.be.true;
                expect(removeStub.calledWithExactly('/var/www/ghost/.ghostpid')).to.be.true;
                done();
            });

            cp.emit('exit', 1);
        });

        it('writes pid to file, rejects on message event with error', function (done) {
            const cp = new EventEmitter();
            cp.stderr = {
                on: sinon.stub(),
                destroy: sinon.stub()
            };
            cp.pid = 42;
            const spawnStub = sinon.stub(childProcess, 'spawn').returns(cp);
            const writeFileStub = sinon.stub(fs, 'writeFileSync');
            const removeStub = sinon.stub(fs, 'removeSync');

            const LocalProcess = require(modulePath);
            const instance = new LocalProcess({}, {}, {});
            const checkStub = sinon.stub(instance, '_checkContentFolder').returns(true);
            const startPromise = instance.start('/var/www/ghost', 'production');

            expect(checkStub.calledWithExactly('/var/www/ghost')).to.be.true;

            startPromise.then(() => {
                done(new Error('Start should have rejected'));
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.GhostError);
                expect(error.message).to.equal('Test Error Message');
                expect(spawnStub.called).to.be.true;
                expect(cp.stderr.on.calledOnce).to.be.true;
                expect(writeFileStub.calledWithExactly('/var/www/ghost/.ghostpid', '42')).to.be.true;
                expect(removeStub.calledWithExactly('/var/www/ghost/.ghostpid')).to.be.true;
                done();
            });

            cp.emit('message', {error: true, message: 'Test Error Message'});
        });

        it('writes pid to file, resolves on start message', function (done) {
            const cp = new EventEmitter();
            cp.stderr = {
                on: sinon.stub(),
                destroy: sinon.stub()
            };
            cp.pid = 42;
            cp.unref = sinon.stub();
            cp.disconnect = sinon.stub();

            const spawnStub = sinon.stub(childProcess, 'spawn').returns(cp);
            const writeFileStub = sinon.stub(fs, 'writeFileSync');

            const LocalProcess = require(modulePath);
            const instance = new LocalProcess({}, {}, {});
            const checkStub = sinon.stub(instance, '_checkContentFolder').returns(true);
            const startPromise = instance.start('/var/www/ghost', 'production');

            expect(checkStub.calledWithExactly('/var/www/ghost')).to.be.true;

            startPromise.then(() => {
                expect(spawnStub.calledOnce).to.be.true;
                expect(writeFileStub.calledWithExactly('/var/www/ghost/.ghostpid', '42')).to.be.true;
                expect(cp.stderr.on.calledOnce).to.be.true;
                expect(cp.stderr.destroy.calledOnce).to.be.true;
                expect(cp.disconnect.calledOnce).to.be.true;
                expect(cp.unref.calledOnce).to.be.true;
                done();
            }).catch(done);

            cp.emit('message', {started: true});
        });
    });

    describe('stop', function () {
        it('returns if pidfile not found', function () {
            const readFileStub = sinon.stub(fs, 'readFileSync').throws({code: 'ENOENT'});
            const fkillStub = sinon.stub();

            const LocalProcess = proxyquire(modulePath, {
                fkill: fkillStub
            });
            const instance = new LocalProcess({}, {}, {});

            return instance.stop('/var/www/ghost').then(() => {
                expect(readFileStub.calledWithExactly('/var/www/ghost/.ghostpid')).to.be.true;
                expect(fkillStub.called).to.be.false;
            });
        });

        it('rejects if any unexpected error occurs during reading of pidfile', function (done) {
            const readFileStub = sinon.stub(fs, 'readFileSync').throws(new Error('test error'));
            const fkillStub = sinon.stub();

            const LocalProcess = proxyquire(modulePath, {
                fkill: fkillStub
            });
            const instance = new LocalProcess({}, {}, {});

            instance.stop('/var/www/ghost').then(() => {
                done(new Error('stop should have rejected'));
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.CliError);
                expect(error.message).to.equal('An unexpected error occurred when reading the pidfile.');
                expect(readFileStub.calledWithExactly('/var/www/ghost/.ghostpid')).to.be.true;
                expect(fkillStub.called).to.be.false;
                done();
            });
        });

        it('calls fkill and removes pidfile', function () {
            const readFileStub = sinon.stub(fs, 'readFileSync').returns('42');
            const removeStub = sinon.stub(fs, 'removeSync');
            const fkillStub = sinon.stub().resolves();

            const LocalProcess = proxyquire(modulePath, {
                fkill: fkillStub
            });
            const instance = new LocalProcess({}, {
                platform: {windows: true}
            }, {});

            return instance.stop('/var/www/ghost').then(() => {
                expect(readFileStub.calledWithExactly('/var/www/ghost/.ghostpid')).to.be.true;
                expect(fkillStub.calledWithExactly(42, {force: true})).to.be.true;
                expect(removeStub.calledWithExactly('/var/www/ghost/.ghostpid')).to.be.true;
            });
        });

        it('resolves if process didn\'t exist', function () {
            const readFileStub = sinon.stub(fs, 'readFileSync').returns('42');
            const removeStub = sinon.stub(fs, 'removeSync');
            const fkillStub = sinon.stub().rejects(new Error('No such process: 42'));

            const LocalProcess = proxyquire(modulePath, {
                fkill: fkillStub
            });
            const instance = new LocalProcess({}, {
                platform: {macos: true, windows: false}
            }, {});

            return instance.stop('/var/www/ghost').then(() => {
                expect(readFileStub.calledWithExactly('/var/www/ghost/.ghostpid')).to.be.true;
                expect(fkillStub.calledWithExactly(42, {force: false})).to.be.true;
                expect(removeStub.calledWithExactly('/var/www/ghost/.ghostpid')).to.be.true;
            });
        });

        it('rejects with an unknown error from fkill', function (done) {
            const readFileStub = sinon.stub(fs, 'readFileSync').returns('42');
            const removeStub = sinon.stub(fs, 'removeSync');
            const fkillStub = sinon.stub().callsFake(() => Promise.reject(new Error('no idea')));

            const LocalProcess = proxyquire(modulePath, {
                fkill: fkillStub
            });
            const instance = new LocalProcess({}, {
                platform: {macos: true, windows: false}
            }, {});

            instance.stop('/var/www/ghost').then(() => {
                done(new Error('stop should have rejected'));
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.CliError);
                expect(error.message).to.equal('An unexpected error occurred while stopping Ghost.');
                expect(readFileStub.calledWithExactly('/var/www/ghost/.ghostpid')).to.be.true;
                expect(fkillStub.calledWithExactly(42, {force: false})).to.be.true;
                expect(removeStub.calledOnce).to.be.false;
                done();
            });
        });
    });

    describe('_checkContentFolder', function () {
        let LocalProcess;
        let modeStub;

        beforeEach(() => {
            modeStub = sinon.stub();
            LocalProcess = proxyquire(modulePath, {
                'stat-mode': modeStub
            });
        });

        it('skips if windows', function () {
            const statStub = sinon.stub(fs, 'lstatSync');
            const instance = new LocalProcess({}, {
                platform: {windows: true}
            }, {});
            modeStub.returns({others: {write: false, read: false}});

            const result = instance._checkContentFolder('/var/www/ghost');

            expect(result).to.be.true;
            expect(statStub.called).to.be.false;
            expect(modeStub.called).to.be.false;
        });

        it('returns true if getuid and lstatSync match', function () {
            const statStub = sinon.stub(fs, 'lstatSync').returns({uid: 1});
            const uidStub = sinon.stub(process, 'getuid').returns(1);
            modeStub.returns({others: {write: false, read: false}});

            const instance = new LocalProcess({}, {
                platform: {linux: true}
            }, {});
            const result = instance._checkContentFolder('/var/www/ghost');

            expect(result).to.be.true;
            expect(statStub.calledOnce).to.be.true;
            expect(statStub.calledWithExactly('/var/www/ghost/content')).to.be.true;
            expect(uidStub.calledOnce).to.be.true;
            expect(modeStub.called).to.be.false;
        });

        it('returns true if getuid and lstatSync don\'t match, but current user has read&write permissions', function () {
            const statStub = sinon.stub(fs, 'lstatSync').returns({uid: 2});
            const uidStub = sinon.stub(process, 'getuid').returns(1);
            modeStub.returns({others: {write: true, read: true}});

            const instance = new LocalProcess({}, {
                platform: {linux: true}
            }, {});
            const result = instance._checkContentFolder('/var/www/ghost');

            expect(result).to.be.true;
            expect(statStub.calledOnce).to.be.true;
            expect(statStub.calledWithExactly('/var/www/ghost/content')).to.be.true;
            expect(uidStub.calledOnce).to.be.true;
            expect(modeStub.calledOnce).to.be.true;
        });

        it('returns false if getuid and lstatSync don\'t match, and current user doesn\'t have read&write permissions', function () {
            const statStub = sinon.stub(fs, 'lstatSync').returns({uid: 2});
            const uidStub = sinon.stub(process, 'getuid').returns(1);
            modeStub.returns({others: {write: false, read: false}});

            const instance = new LocalProcess({}, {
                platform: {linux: true}
            }, {});
            const result = instance._checkContentFolder('/var/www/ghost');

            expect(result).to.be.false;
            expect(statStub.calledOnce).to.be.true;
            expect(statStub.calledWithExactly('/var/www/ghost/content')).to.be.true;
            expect(uidStub.calledOnce).to.be.true;
            expect(modeStub.calledOnce).to.be.true;
        });
    });
});
