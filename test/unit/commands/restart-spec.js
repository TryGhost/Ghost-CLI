'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');

const RestartCommand = require('../../../lib/commands/restart');
const Instance = require('../../../lib/instance');

describe('Unit: Command > Restart', function () {
    it('throws error if instance is not running', function () {
        class TestInstance extends Instance {
            get running() { return false; }
        }
        let testInstance = new TestInstance();

        let command = new RestartCommand({}, {
            getInstance: () => testInstance
        });

        return command.run().then(() => {
            throw new Error('Run method should have thrown');
        }).catch((error) => {
            expect(error.message).to.match(/instance is not currently running/);
        });
    });

    it('calls process restart method if instance is running', function () {
        let restartStub = sinon.stub().resolves();
        class TestInstance extends Instance {
            get running() { return true; }
            get process() { return { restart: restartStub }; }
        }
        let testInstance = new TestInstance();
        let loadRunEnvStub = sinon.stub(testInstance, 'loadRunningEnvironment');
        let runStub = sinon.stub().resolves();

        let command = new RestartCommand({
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
