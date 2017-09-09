'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');

const ProcessManager = require('../../lib/process-manager');

describe('Unit: Process Manager', function () {
    describe('isValid', function () {
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
                start() { return Promise.resolve(); }
                stop() { return Promise.resolve(); }
                isRunning() { return true; }
            }
            const result = ProcessManager.isValid(TestProcess);
            expect(result).to.be.true;
        });
    });

    describe('supportsEnableBehavior', function () {
        it('returns false if the class does not implement all of the methods for enable behavior', function () {
            const instance = new ProcessManager({}, {}, {});
            expect(ProcessManager.supportsEnableBehavior(instance)).to.be.false;
        });

        it('returns true if all the methods for enable behavior are implemented', function () {
            class TestProcess extends ProcessManager {
                isEnabled() { }
                enable() { }
                disable() { }
            }
            const instance = new TestProcess({}, {}, {});
            expect(ProcessManager.supportsEnableBehavior(instance)).to.be.true;
        });
    });

    it('restart base implementation calls start and stop methods', function () {
        const instance = new ProcessManager({}, {}, {});
        const startStub = sinon.stub(instance, 'start').resolves();
        const stopStub = sinon.stub(instance, 'stop').resolves();

        return instance.restart().then(() => {
            expect(stopStub.calledOnce).to.be.true;
            expect(startStub.calledOnce).to.be.true;
            expect(stopStub.calledBefore(startStub)).to.be.true;
        })
    });

    it('base start implementation returns a promise', function () {
        const instance = new ProcessManager({}, {}, {});
        const start = instance.start();

        expect(start).to.be.an.instanceof(Promise);
        return start;
    });

    it('base stop implementation returns a promise', function () {
        const instance = new ProcessManager({}, {}, {});
        const stop = instance.stop();

        expect(stop).to.be.an.instanceof(Promise);
        return stop;
    });

    it('base willRun method returns true', function () {
        expect(ProcessManager.willRun()).to.be.true;
    });

    it('base error method re-throws the error', function () {
        const instance = new ProcessManager({}, {}, {});
        try {
            instance.error({error: true});
            expect(false, 'error should have been thrown').to.be.true;
        } catch (e) {
            expect(e).to.deep.equal({error: true});
        }
    });
});
