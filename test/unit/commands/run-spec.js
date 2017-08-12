'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const configStub = require('../../utils/config-stub');
const EventEmitter = require('events');

const modulePath = '../../../lib/commands/run';
const errors = require('../../../lib/errors');

describe('Unit: Commands > Run', function () {
    describe('run', function () {
        it('logs if stdin is tty', function () {
            const logStub = sinon.stub().throws(new Error('throw me'));
            const RunCommand = require(modulePath);
            const instance = new RunCommand({log: logStub}, {});
            const oldIsTTY = process.stdin.isTTY;
            process.stdin.isTTY = true;

            try {
                instance.run();
                expect(false, 'error should have been thrown').to.be.true;
            } catch (e) {
                process.stdin.isTTY = oldIsTTY;
                expect(e).to.be.an.instanceof(Error);
                expect(e.message).to.equal('throw me');
                expect(logStub.calledOnce).to.be.true;
                expect(logStub.args[0][0]).to.match(/used by the configured Ghost process manager and for debugging/);
            }
        });

        it('sets paths.contentPath if it is not already set in config, and calls useDirect if useGhostUser returns false', function () {
            const logStub = sinon.stub();
            const useGhostUserStub = sinon.stub().returns(false);
            const config = configStub();
            config.has.returns(false);
            const fakeInstance = {config: config, dir: '/var/www/ghost'};
            const getInstanceStub = sinon.stub().returns(fakeInstance);
            const RunCommand = proxyquire(modulePath, {
                '../utils/use-ghost-user': useGhostUserStub
            });
            const instance = new RunCommand({log: logStub}, {getInstance: getInstanceStub});
            const useGhostUser = sinon.stub(instance, 'useGhostUser').resolves();
            const useDirect = sinon.stub(instance, 'useDirect').resolves();
            const oldIsTTY = process.stdin.isTTY;
            process.stdin.isTTY = false;

            return instance.run().then(() => {
                process.stdin.isTTY = oldIsTTY;
                expect(logStub.called).to.be.false;
                expect(getInstanceStub.calledOnce).to.be.true;
                expect(config.has.calledOnce).to.be.true;
                expect(config.has.calledWithExactly('paths.contentPath')).to.be.true;
                expect(config.set.calledOnce).to.be.true;
                expect(config.set.calledWithExactly('paths.contentPath', '/var/www/ghost/content')).to.be.true;
                expect(config.save.calledOnce).to.be.true;

                expect(useGhostUserStub.calledOnce).to.be.true;
                expect(useGhostUser.called).to.be.false;
                expect(useDirect.calledOnce).to.be.true;
                expect(useDirect.calledWithExactly(fakeInstance)).to.be.true;
            });
        });

        it('doesn\'t set paths.contentPath if it is  set in cofig, and calls useGhostUser if useGhostUser util returns false', function () {
            const logStub = sinon.stub();
            const useGhostUserStub = sinon.stub().returns(true);
            const config = configStub();
            config.has.returns(true);
            const fakeInstance = {config: config, dir: '/var/www/ghost'};
            const getInstanceStub = sinon.stub().returns(fakeInstance);
            const RunCommand = proxyquire(modulePath, {
                '../utils/use-ghost-user': useGhostUserStub
            });
            const instance = new RunCommand({log: logStub}, {getInstance: getInstanceStub});
            const useGhostUser = sinon.stub(instance, 'useGhostUser').resolves();
            const useDirect = sinon.stub(instance, 'useDirect').resolves();
            const oldIsTTY = process.stdin.isTTY;
            process.stdin.isTTY = false;

            return instance.run().then(() => {
                process.stdin.isTTY = oldIsTTY;
                expect(logStub.called).to.be.false;
                expect(getInstanceStub.calledOnce).to.be.true;
                expect(config.has.called).to.be.true;
                expect(config.has.calledWithExactly('paths.contentPath')).to.be.true;
                expect(config.set.called).to.be.false;
                expect(config.save.called).to.be.false;

                expect(useGhostUserStub.calledOnce).to.be.true;
                expect(useDirect.called).to.be.false;
                expect(useGhostUser.calledOnce).to.be.true;
                expect(useGhostUser.calledWithExactly(fakeInstance)).to.be.true;
            });
        });
    });

    it('useGhostUser spawns child process and handles events correctly', function () {
        const childStub = new EventEmitter();
        const spawnStub = sinon.stub().returns(childStub);
        const RunCommand = proxyquire(modulePath, {
            child_process: {spawn: spawnStub}
        });
        const failStub = sinon.stub();
        const logStub = sinon.stub()
        const instance = new RunCommand({fail: failStub, log: logStub}, {});
        const exitStub = sinon.stub(process, 'exit');

        instance.useGhostUser({dir: '/var/www/ghost'});

        expect(logStub.calledOnce).to.be.true;
        expect(logStub.args[0][0]).to.match(/Running sudo command/);
        expect(spawnStub.calledOnce).to.be.true;
        expect(spawnStub.calledWithExactly('sudo', [
            '-E',
            '-u',
            'ghost',
            process.execPath,
            'current/index.js'
        ], {
            cwd: '/var/www/ghost',
            stdio: 'inherit'
        })).to.be.true;
        expect(instance.child).to.equal(childStub);

        // Check error handler with EPERM code
        failStub.reset();
        exitStub.reset();
        childStub.emit('error', {message: 'some error occurred', code: 'EPERM'});
        expect(failStub.called).to.be.false;
        expect(exitStub.called).to.be.false;

        // Check error handler without EPERM code
        failStub.reset();
        exitStub.reset();
        childStub.emit('error', {message: 'some error occurred'});
        expect(failStub.calledOnce).to.be.true;
        expect(failStub.calledWithExactly({message: 'some error occurred'})).to.be.true;
        expect(exitStub.calledOnce).to.be.true;
        expect(exitStub.calledWithExactly(1)).to.be.true;

        exitStub.restore();

        // Check that it does nothing on success message
        childStub.emit('message', {started: true}); // nothing should happen

        try {
            // check message handler with error
            childStub.emit('message', {error: 'oops I did it again'});
            expect(false, 'error should have been thrown').to.be.true;
        } catch (e) {
            expect(e).to.be.an.instanceof(errors.GhostError);
            expect(e.message).to.equal('oops I did it again');
        }
    });

    it('useDirect spawns child process and handles events correctly', function () {
        const childStub = new EventEmitter();
        const spawnStub = sinon.stub().returns(childStub);
        const RunCommand = proxyquire(modulePath, {
            child_process: {spawn: spawnStub}
        });
        const failStub = sinon.stub();
        const instance = new RunCommand({fail: failStub}, {});
        const successStub = sinon.stub();
        const errorStub = sinon.stub();
        const exitStub = sinon.stub(process, 'exit');

        instance.useDirect({dir: '/var/www/ghost', process: {success: successStub, error: errorStub}});

        expect(spawnStub.calledOnce).to.be.true;
        expect(spawnStub.calledWithExactly(process.execPath, ['current/index.js'], {
            cwd: '/var/www/ghost',
            stdio: [0, 1, 2, 'ipc']
        })).to.be.true;
        expect(instance.child).to.equal(childStub);

        // Check error handler
        expect(failStub.called).to.be.false;
        expect(exitStub.called).to.be.false;
        childStub.emit('error', {message: 'some error occurred'});
        expect(failStub.calledOnce).to.be.true;
        expect(failStub.calledWithExactly({message: 'some error occurred'})).to.be.true;
        expect(exitStub.calledOnce).to.be.true;
        expect(exitStub.calledWithExactly(1)).to.be.true;

        // Check message handler with success
        expect(successStub.called).to.be.false;
        expect(errorStub.called).to.be.false;
        childStub.emit('message', {started: true});
        expect(successStub.calledOnce).to.be.true;
        expect(errorStub.called).to.be.false;

        successStub.reset();
        errorStub.reset();
        // check message handler with error
        childStub.emit('message', {error: 'oops I did it again'});
        expect(successStub.called).to.be.false;
        expect(errorStub.calledOnce).to.be.true;
        expect(errorStub.calledWithExactly('oops I did it again')).to.be.true;

        exitStub.restore();
    });

    describe('cleanup handler', function () {
        const RunCommand = require(modulePath);

        it('doesn\'t do anything if child process has not been set', function () {
            const instance = new RunCommand({}, {});
            expect(instance.child).to.not.exist;

            instance.cleanup(); // If no error is thrown then it was successful
        });

        it('attempts to kill child process, and doesn\'t throw if error is EPERM and sudo is true', function () {
            const instance = new RunCommand({}, {});
            const err = new Error();
            err.code = 'EPERM';
            const killStub = sinon.stub().throws(err);
            instance.child = {kill: killStub};
            instance.sudo = true;

            instance.cleanup();
            expect(killStub.calledOnce).to.be.true;
        });

        it('attempts to kill child process and throws if kill fails and not sudo', function () {
            const instance = new RunCommand({}, {});
            const err = new Error();
            err.code = 'EPERM';
            const killStub = sinon.stub().throws(err);
            instance.child = {kill: killStub};
            instance.sudo = false;

            try {
                instance.cleanup();
                expect(false, 'error should have been thrown').to.be.true;
            } catch (e) {
                expect(e).to.be.an.instanceof(Error);
                expect(e.code).to.equal('EPERM');
                expect(killStub.calledOnce).to.be.true;
            }
        });

        it('attempts to kill child process and throws if kill fails and error code is not EPERM', function () {
            const instance = new RunCommand({}, {});
            const err = new Error('yikes');
            err.code = 'ENOTFOUND';
            const killStub = sinon.stub().throws(err);
            instance.child = {kill: killStub};
            instance.sudo = true;

            try {
                instance.cleanup();
                expect(false, 'error should have been thrown').to.be.true;
            } catch (e) {
                expect(e).to.be.an.instanceof(Error);
                expect(e.message).to.equal('yikes');
                expect(e.code).to.equal('ENOTFOUND');
                expect(killStub.calledOnce).to.be.true;
            }
        });
    });
});
