'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');

const modulePath = '../../../lib/commands/restart';
const RestartCommand = require(modulePath);

describe('Unit: Command > Restart', function () {
    it('warns of stopped instance and starts instead', async function () {
        const instance = {running: () => Promise.resolve(false)};
        const logStub = sinon.stub();

        const command = new RestartCommand({log: logStub}, {getInstance: () => instance});
        const runCommand = sinon.stub(command, 'runCommand').resolves();

        await command.run();
        expect(runCommand.calledOnce).to.be.true;
        expect(runCommand.args[0][0].description).to.equal('Start an instance of Ghost');
        expect(logStub.calledOnce).to.be.true;
        expect(logStub.args[0][0]).to.match(/not running!/);
    });

    it('calls process restart method if instance is running', async function () {
        const runStub = sinon.stub().resolves();
        const restartStub = sinon.stub().resolves();
        const lreStub = sinon.stub();
        const instance = {
            process: {restart: restartStub},
            loadRunningEnvironment: lreStub,
            running: () => Promise.resolve(true)
        };

        const command = new RestartCommand({run: runStub}, {
            environment: 'testing',
            getInstance: () => instance
        });

        await command.run();

        expect(lreStub.calledOnce).to.be.true;
        expect(lreStub.args[0][0]).to.be.true;
        expect(restartStub.calledOnce).to.be.true;
        expect(restartStub.args[0]).to.deep.equal([process.cwd(), 'testing']);
        expect(runStub.calledOnce).to.be.true;
    });
});
