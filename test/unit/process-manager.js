'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');

const ProcessManager = require('../../lib/process-manager');

describe('Unit: Process Manager', function () {
    describe('isValid', function () {
        it('returns false if passed class is not a subclass of ProcessManager', function () {
            let result = ProcessManager.isValid({});
            expect(result).to.be.false;
        });

        it('returns array of missing methods if class is missing required methods', function () {
            class TestProcess extends ProcessManager {}
            let result = ProcessManager.isValid(TestProcess);

            expect(result).to.deep.equal(['start', 'stop', 'isRunning']);
        });

        it('returns true if class exists and implements all the right methods', function () {
            class TestProcess extends ProcessManager {
                start() { return Promise.resolve(); }
                stop() { return Promise.resolve(); }
                isRunning() { return true; }
            }
            let result = ProcessManager.isValid(TestProcess);
            expect(result).to.be.true;
        });
    });

    it('restart base implementation calls start and stop methods', function () {
        let instance = new ProcessManager({}, {}, {});
        let startStub = sinon.stub(instance, 'start').resolves();
        let stopStub = sinon.stub(instance, 'stop').resolves();

        return instance.restart().then(() => {
            expect(stopStub.calledOnce).to.be.true;
            expect(startStub.calledOnce).to.be.true;
            expect(stopStub.calledBefore(startStub)).to.be.true;
        })
    });
});
