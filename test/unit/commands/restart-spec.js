'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');

const modulePath = '../../../lib/commands/restart';
const RestartCommand = require(modulePath);
const Instance = require('../../../lib/instance');

describe('Unit: Command > Restart', function () {
    it('warns of stopped instance and starts instead', function () {
        const instance = {running: () => false};
        const logStub = sinon.stub();
        const ctx = {
            ui: {log: logStub},
            system: {getInstance: () => instance},
            runCommand: sinon.stub().resolves()
        }
        const command = new RestartCommand({}, {});

        return command.run.call(ctx).then(() => {
            expect(ctx.runCommand.calledOnce).to.be.true;
            expect(ctx.runCommand.args[0][0].description).to.equal('Start an instance of Ghost');
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/not running!/);
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
