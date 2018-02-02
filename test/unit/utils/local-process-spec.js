'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const errors = require('../../../lib/errors');
const EventEmitter = require('events').EventEmitter;

const fs = require('fs-extra');
const childProcess = require('child_process');
const os = require('os');

const modulePath = '../../../lib/utils/local-process';

describe('Unit: Utils > local-process', function () {
    const sandbox = sinon.sandbox.create();

    before(() => {
        process.send = process.send || (() => {});
    });

    afterEach(() => {
        // This is here so we at least have a function to stub out
        sandbox.restore();
    });

    it('willRun returns true', function () {
        const LocalProcess = require(modulePath);
        expect(LocalProcess.willRun()).to.be.true;
    });

    it('success works', function () {
        const successStub = sandbox.stub(process, 'send');
        const LocalProcess = require(modulePath);

        const instance = new LocalProcess({}, {}, {});
        instance.success();

        expect(successStub.calledOnce).to.be.true;
        expect(successStub.calledWithExactly({started: true})).to.be.true;
    });

    it('error works', function () {
        const errorStub = sandbox.stub(process, 'send');
        const LocalProcess = require(modulePath);

        const instance = new LocalProcess({}, {}, {});
        instance.error({message: 'Test Error'});

        expect(errorStub.calledOnce).to.be.true;
        expect(errorStub.calledWithExactly({error: true, message: 'Test Error'})).to.be.true;
    });

    describe('isRunning', function () {
        it('returns false if pidfile doesn\'t exist', function () {
            const existsStub = sandbox.stub(fs, 'existsSync').returns(false);
            const LocalProcess = require(modulePath);
            const instance = new LocalProcess({}, {}, {});
            const result = instance.isRunning('/var/www/ghost');

            expect(result).to.be.false;
            expect(existsStub.calledWithExactly('/var/www/ghost/.ghostpid')).to.be.true;
        });

        it('fetches pid from file, removes pidfile and returns false if not running', function () {
            const existsStub = sandbox.stub(fs, 'existsSync').returns(true);
            const readFileStub = sandbox.stub(fs, 'readFileSync').returns('42');
            const removeStub = sandbox.stub(fs, 'removeSync');
            const isRunningStub = sandbox.stub().returns(false);

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
            const existsStub = sandbox.stub(fs, 'existsSync').returns(true);
            const readFileStub = sandbox.stub(fs, 'readFileSync').returns('42');
            const removeStub = sandbox.stub(fs, 'removeSync');
            const isRunningStub = sandbox.stub().returns(true);

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

            const checkStub = sandbox.stub(instance, '_checkContentFolder').returns(false);

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
            cp.pid = 42;
            const spawnStub = sandbox.stub(childProcess, 'spawn').returns(cp);
            const writeFileStub = sandbox.stub(fs, 'writeFileSync');

            const LocalProcess = require(modulePath);
            const instance = new LocalProcess({}, {}, {});
            const checkStub = sandbox.stub(instance, '_checkContentFolder').returns(true);
            const startPromise = instance.start('/var/www/ghost', 'production');

            expect(checkStub.calledWithExactly('/var/www/ghost')).to.be.true;

            startPromise.then(() => {
                done(new Error('Start should have rejected'));
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.CliError);
                expect(error.message).to.equal('An error occurred while starting Ghost.');
                expect(spawnStub.calledOnce).to.be.true;
                expect(writeFileStub.calledWithExactly('/var/www/ghost/.ghostpid', 42)).to.be.true;
                done();
            });

            cp.emit('error', {message: 'something happened'});
        });

        it('writes pid to file, rejects on exit event', function (done) {
            const cp = new EventEmitter();
            cp.pid = 42;
            const spawnStub = sandbox.stub(childProcess, 'spawn').returns(cp);
            const writeFileStub = sandbox.stub(fs, 'writeFileSync');
            const removeStub = sandbox.stub(fs, 'removeSync');

            const LocalProcess = require(modulePath);
            const instance = new LocalProcess({}, {}, {});
            const checkStub = sandbox.stub(instance, '_checkContentFolder').returns(true);
            const startPromise = instance.start('/var/www/ghost', 'production');

            expect(checkStub.calledWithExactly('/var/www/ghost')).to.be.true;

            startPromise.then(() => {
                done(new Error('Start should have rejected'));
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.GhostError);
                expect(error.message).to.equal('Ghost process exited with code: 1');
                expect(spawnStub.calledOnce).to.be.true;
                expect(writeFileStub.calledWithExactly('/var/www/ghost/.ghostpid', 42)).to.be.true;
                expect(removeStub.calledWithExactly('/var/www/ghost/.ghostpid')).to.be.true;
                done();
            });

            cp.emit('exit', 1);
        });

        it('writes pid to file, rejects on message event with error', function (done) {
            const cp = new EventEmitter();
            cp.pid = 42;
            const spawnStub = sandbox.stub(childProcess, 'spawn').returns(cp);
            const writeFileStub = sandbox.stub(fs, 'writeFileSync');
            const removeStub = sandbox.stub(fs, 'removeSync');

            const LocalProcess = require(modulePath);
            const instance = new LocalProcess({}, {}, {});
            const checkStub = sandbox.stub(instance, '_checkContentFolder').returns(true);
            const startPromise = instance.start('/var/www/ghost', 'production');

            expect(checkStub.calledWithExactly('/var/www/ghost')).to.be.true;

            startPromise.then(() => {
                done(new Error('Start should have rejected'));
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.GhostError);
                expect(error.message).to.equal('Test Error Message');
                expect(spawnStub.called).to.be.true;
                expect(writeFileStub.calledWithExactly('/var/www/ghost/.ghostpid', 42)).to.be.true;
                expect(removeStub.calledWithExactly('/var/www/ghost/.ghostpid')).to.be.true;
                done();
            });

            cp.emit('message', {error: 'Test Error Message'});
        });

        it('writes pid to file, resolves on start message', function (done) {
            const cp = new EventEmitter();
            cp.pid = 42;
            cp.unref = sandbox.stub();
            cp.disconnect = sandbox.stub();

            const spawnStub = sandbox.stub(childProcess, 'spawn').returns(cp);
            const writeFileStub = sandbox.stub(fs, 'writeFileSync');

            const LocalProcess = require(modulePath);
            const instance = new LocalProcess({}, {}, {});
            const checkStub = sandbox.stub(instance, '_checkContentFolder').returns(true);
            const startPromise = instance.start('/var/www/ghost', 'production');

            expect(checkStub.calledWithExactly('/var/www/ghost')).to.be.true;

            startPromise.then(() => {
                expect(spawnStub.calledOnce).to.be.true;
                expect(writeFileStub.calledWithExactly('/var/www/ghost/.ghostpid', 42)).to.be.true;
                expect(cp.disconnect.calledOnce).to.be.true;
                expect(cp.unref.calledOnce).to.be.true;
                done();
            }).catch(done);

            cp.emit('message', {started: true});
        });
    });

    describe('stop', function () {
        it('returns if pidfile not found', function () {
            const readFileStub = sandbox.stub(fs, 'readFileSync').throws({code: 'ENOENT'});
            const fkillStub = sandbox.stub();

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
            const readFileStub = sandbox.stub(fs, 'readFileSync').throws(new Error('test error'));
            const fkillStub = sandbox.stub();

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
            const readFileStub = sandbox.stub(fs, 'readFileSync').returns('42');
            const removeStub = sandbox.stub(fs, 'removeSync');
            const platformStub = sandbox.stub(os, 'platform').returns('win32');
            const fkillStub = sandbox.stub().resolves();

            const LocalProcess = proxyquire(modulePath, {
                fkill: fkillStub
            });
            const instance = new LocalProcess({}, {}, {});

            return instance.stop('/var/www/ghost').then(() => {
                expect(readFileStub.calledWithExactly('/var/www/ghost/.ghostpid')).to.be.true;
                expect(platformStub.calledOnce).to.be.true;
                expect(fkillStub.calledWithExactly(42, {force: true})).to.be.true;
                expect(removeStub.calledWithExactly('/var/www/ghost/.ghostpid')).to.be.true;
            });
        });

        it('resolves if process didn\'t exist', function () {
            const readFileStub = sandbox.stub(fs, 'readFileSync').returns('42');
            const removeStub = sandbox.stub(fs, 'removeSync');
            const platformStub = sandbox.stub(os, 'platform').returns('darwin');
            const fkillStub = sandbox.stub().rejects(new Error('No such process: 42'));

            const LocalProcess = proxyquire(modulePath, {
                fkill: fkillStub
            });
            const instance = new LocalProcess({}, {}, {});

            return instance.stop('/var/www/ghost').then(() => {
                expect(readFileStub.calledWithExactly('/var/www/ghost/.ghostpid')).to.be.true;
                expect(platformStub.calledOnce).to.be.true;
                expect(fkillStub.calledWithExactly(42, {force: false})).to.be.true;
                expect(removeStub.calledWithExactly('/var/www/ghost/.ghostpid')).to.be.true;
            });
        });

        it('rejects with an unknown error from fkill', function (done) {
            const readFileStub = sandbox.stub(fs, 'readFileSync').returns('42');
            const removeStub = sandbox.stub(fs, 'removeSync');
            const platformStub = sandbox.stub(os, 'platform').returns('darwin');
            const fkillStub = sandbox.stub().callsFake(() => Promise.reject(new Error('no idea')));

            const LocalProcess = proxyquire(modulePath, {
                fkill: fkillStub
            });
            const instance = new LocalProcess({}, {}, {});

            instance.stop('/var/www/ghost').then(() => {
                done(new Error('stop should have rejected'))
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.CliError);
                expect(error.message).to.equal('An unexpected error occurred while stopping Ghost.');
                expect(readFileStub.calledWithExactly('/var/www/ghost/.ghostpid')).to.be.true;
                expect(platformStub.calledOnce).to.be.true;
                expect(fkillStub.calledWithExactly(42, {force: false})).to.be.true;
                expect(removeStub.calledOnce).to.be.false;
                done();
            });
        });
    });

    describe('_checkContentFolder', function () {
        const LocalProcess = require(modulePath);

        it('skips if windows', function () {
            const statStub = sandbox.stub(fs, 'lstatSync');
            const platformStub = sandbox.stub(os, 'platform').returns('win32');
            const instance = new LocalProcess({}, {}, {});

            const result = instance._checkContentFolder('/var/www/ghost');

            expect(result).to.be.true;
            expect(platformStub.calledOnce).to.be.true;
            expect(statStub.called).to.be.false;
        });

        it('returns false if getuid and lstatSync don\'t match', function () {
            const platformStub = sandbox.stub(os, 'platform').returns('linux');
            const statStub = sandbox.stub(fs, 'lstatSync').returns({uid: 2});
            const uidStub = sandbox.stub(process, 'getuid').returns(1);

            const instance = new LocalProcess({}, {}, {});
            const result = instance._checkContentFolder('/var/www/ghost');

            expect(result).to.be.false;
            expect(platformStub.calledOnce).to.be.true;
            expect(statStub.calledOnce).to.be.true;
            expect(statStub.calledWithExactly('/var/www/ghost/content')).to.be.true;
            expect(uidStub.calledOnce).to.be.true;
        });

        it('returns true if getuid and lstatSync match', function () {
            const platformStub = sandbox.stub(os, 'platform').returns('linux');
            const statStub = sandbox.stub(fs, 'lstatSync').returns({uid: 1});
            const uidStub = sandbox.stub(process, 'getuid').returns(1);

            const instance = new LocalProcess({}, {}, {});
            const result = instance._checkContentFolder('/var/www/ghost');

            expect(result).to.be.true;
            expect(platformStub.calledOnce).to.be.true;
            expect(statStub.calledOnce).to.be.true;
            expect(statStub.calledWithExactly('/var/www/ghost/content')).to.be.true;
            expect(uidStub.calledOnce).to.be.true;
        });
    });
});
