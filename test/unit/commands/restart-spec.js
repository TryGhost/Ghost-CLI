'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');

const RestartCommand = require('../../../lib/commands/restart');
const Instance = require('../../../lib/instance');

describe('Unit: Command > Restart', function () {
    it('throws error if instance is not running', function () {
        class TestInstance extends Instance {
            running() { return false; }
        }
        const testInstance = new TestInstance();

        const command = new RestartCommand({}, {
            getInstance: () => testInstance
        });

        return command.run().then(() => {
            throw new Error('Run method should have thrown');
        }).catch((error) => {
            expect(error.message).to.match(/instance is not currently running/);
        });
    });

    it('calls process restart method if instance is running', function () {
        const restartStub = sinon.stub().resolves();
        class TestInstance extends Instance {
            get process() { return {restart: restartStub}; }
            running() { return true; }
        }
        const testInstance = new TestInstance();
        const loadRunEnvStub = sinon.stub(testInstance, 'loadRunningEnvironment');
        const runStub = sinon.stub().resolves();

        const command = new RestartCommand({
            run: runStub
        }, {
            environment: 'testing',
            getInstance: () => testInstance
        });

        return command.run().then(() => {
            expect(loadRunEnvStub.calledOnce).to.be.true;
            expect(loadRunEnvStub.args[0][0]).to.be.true;
            expect(restartStub.calledOnce).to.be.true;
            expect(restartStub.args[0]).to.deep.equal([process.cwd(), 'testing']);
            expect(runStub.calledOnce).to.be.true;
        });
    });
});
