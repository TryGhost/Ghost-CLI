'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const getConfigStub = require('../utils/config-stub');

const modulePath = '../../lib/process-manager';

describe('Unit: Process Manager', function () {
    afterEach(() => {
        sinon.restore();
    });

    describe('isValid', function () {
        const ProcessManager = require(modulePath);

        it('returns false if passed class is not a subclass of ProcessManager', function () {
            const result = ProcessManager.isValid({});
            expect(result).to.be.false;
        });

        it('returns array of missing methods if class is missing required methods', function () {
            class TestProcess extends ProcessManager {}
            const result = ProcessManager.isValid(TestProcess);

            expect(result).to.deep.equal(['start', 'stop', 'isRunning']);
        });

        it('returns true if class exists and implements all the right methods', function () {
            class TestProcess extends ProcessManager {
                start() {
                    return Promise.resolve();
                }
                stop() {
                    return Promise.resolve();
                }
                isRunning() {
                    return true;
                }
            }
            const result = ProcessManager.isValid(TestProcess);
            expect(result).to.be.true;
        });
    });

    describe('ensureStarted', function () {
        const portPollingStub = sinon.stub();
        const ProcessManager = proxyquire(modulePath, {
            './utils/port-polling': portPollingStub
        });

        afterEach(() => {
            portPollingStub.reset();
        });

        it('calls portPolling with options', function () {
            const config = getConfigStub();

            config.get.withArgs('server.port').returns(2368);
            config.get.withArgs('server.host').returns('10.0.1.0');
            portPollingStub.resolves();

            const instance = new ProcessManager({}, {}, {config, version: '1.25.0'});
            const stopStub = sinon.stub(instance, 'stop').resolves();

            return instance.ensureStarted({logSuggestion: 'test'}).then(() => {
                expect(portPollingStub.calledOnce).to.be.true;
                expect(config.get.calledTwice).to.be.true;
                expect(portPollingStub.calledWithExactly({
                    logSuggestion: 'test',
                    stopOnError: true,
                    port: 2368,
                    host: '10.0.1.0',
                    useNetServer: false
                })).to.be.true;
                expect(stopStub.called).to.be.false;
            });
        });

        it('throws error without stopping if stopOnError is false', function () {
            const config = getConfigStub();

            config.get.withArgs('server.port').returns(2368);
            config.get.withArgs('server.host').returns('localhost');
            portPollingStub.rejects(new Error('test error'));

            const instance = new ProcessManager({}, {}, {config, version: '1.25.0'});
            const stopStub = sinon.stub(instance, 'stop').resolves();

            return instance.ensureStarted({stopOnError: false}).then(() => {
                expect(false, 'Error should have been thrown').to.be.true;
            }).catch((err) => {
                expect(err.message).to.equal('test error');
                expect(portPollingStub.calledOnce).to.be.true;
                expect(portPollingStub.calledWithExactly({
                    stopOnError: false,
                    port: 2368,
                    host: 'localhost',
                    useNetServer: false
                })).to.be.true;
                expect(stopStub.called).to.be.false;
            });
        });

        it('throws error and calls stop if stopOnError is true', function () {
            const config = getConfigStub();

            config.get.withArgs('server.port').returns(2368);
            config.get.withArgs('server.host').returns('localhost');
            portPollingStub.rejects(new Error('test error'));

            const instance = new ProcessManager({}, {}, {config, version: '1.25.0'});
            const stopStub = sinon.stub(instance, 'stop').resolves();

            return instance.ensureStarted({}).then(() => {
                expect(false, 'Error should have been thrown').to.be.true;
            }).catch((err) => {
                expect(err.message).to.equal('test error');
                expect(config.get.calledTwice).to.be.true;
                expect(portPollingStub.calledOnce).to.be.true;
                expect(portPollingStub.calledWithExactly({
                    stopOnError: true,
                    port: 2368,
                    host: 'localhost',
                    useNetServer: false
                })).to.be.true;
                expect(stopStub.calledOnce).to.be.true;
            });
        });

        it('throws error and calls stop (swallows stop error) if stopOnError is true', function () {
            const config = getConfigStub();

            config.get.withArgs('server.port').returns(2368);
            config.get.withArgs('server.host').returns('localhost');
            portPollingStub.rejects(new Error('test error'));

            const instance = new ProcessManager({}, {}, {config, version: '1.25.0'});
            const stopStub = sinon.stub(instance, 'stop').rejects(new Error('test error 2'));

            return instance.ensureStarted().then(() => {
                expect(false, 'Error should have been thrown').to.be.true;
            }).catch((err) => {
                expect(err.message).to.equal('test error');
                expect(config.get.calledTwice).to.be.true;
                expect(portPollingStub.calledOnce).to.be.true;
                expect(portPollingStub.calledWithExactly({
                    stopOnError: true,
                    port: 2368,
                    host: 'localhost',
                    useNetServer: false
                })).to.be.true;
                expect(stopStub.calledOnce).to.be.true;
            });
        });
    });

    it('restart base implementation calls start and stop methods', function () {
        const ProcessManager = require(modulePath);
        const instance = new ProcessManager({}, {}, {});
        const startStub = sinon.stub(instance, 'start').resolves();
        const stopStub = sinon.stub(instance, 'stop').resolves();

        return instance.restart().then(() => {
            expect(stopStub.calledOnce).to.be.true;
            expect(startStub.calledOnce).to.be.true;
            expect(stopStub.calledBefore(startStub)).to.be.true;
        });
    });

    it('base start implementation returns a promise', function () {
        const ProcessManager = require(modulePath);
        const instance = new ProcessManager({}, {}, {});
        const start = instance.start();

        expect(start).to.be.an.instanceof(Promise);
        return start;
    });

    it('base stop implementation returns a promise', function () {
        const ProcessManager = require(modulePath);
        const instance = new ProcessManager({}, {}, {});
        const stop = instance.stop();

        expect(stop).to.be.an.instanceof(Promise);
        return stop;
    });

    it('base isRunning implementation returns a promise', function () {
        const ProcessManager = require(modulePath);
        const instance = new ProcessManager({}, {}, {});

        return instance.isRunning().then((result) => {
            expect(result).to.be.false;
        });
    });

    it('base isEnabled returns true', async function () {
        const ProcessManager = require(modulePath);
        const instance = new ProcessManager({}, {}, {});

        const result = await instance.isEnabled();
        expect(result).to.be.false;
    });

    it('base enable method', async function () {
        const ProcessManager = require(modulePath);
        const instance = new ProcessManager({}, {}, {});

        await instance.enable();
    });

    it('base disable method', async function () {
        const ProcessManager = require(modulePath);
        const instance = new ProcessManager({}, {}, {});

        await instance.disable();
    });

    it('base willRun method returns true', function () {
        const ProcessManager = require(modulePath);
        expect(ProcessManager.willRun()).to.be.true;
    });

    it('base error method re-throws the error', function () {
        const ProcessManager = require(modulePath);
        const instance = new ProcessManager({}, {}, {});
        try {
            instance.error({error: true});
            expect(false, 'error should have been thrown').to.be.true;
        } catch (e) {
            expect(e).to.deep.equal({error: true});
        }
    });
});
