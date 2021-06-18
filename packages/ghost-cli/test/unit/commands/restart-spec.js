'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');

const modulePath = '../../../lib/commands/restart';
const RestartCommand = require(modulePath);

describe('Unit: Command > Restart', function () {
    it('warns of stopped instance and starts instead', async function () {
        const instance = {
            isRunning: sinon.stub().resolves(false),
            start: sinon.stub().resolves()
        };
        const ui = {
            log: sinon.stub(),
            run: sinon.stub().callsFake(fn => fn())
        };
        const system = {
            getInstance: sinon.stub().returns(instance)
        };

        const command = new RestartCommand(ui, system);
        await command.run();

        expect(instance.isRunning.calledOnce).to.be.true;
        expect(ui.log.calledOnce).to.be.true;
        expect(ui.log.args[0][0]).to.match(/not running!/);
        expect(ui.run.calledOnce).to.be.true;
        expect(instance.start.calledOnce).to.be.true;
    });

    it('calls process restart method if instance is running', async function () {
        const instance = {
            isRunning: sinon.stub().resolves(true),
            loadRunningEnvironment: sinon.stub(),
            restart: sinon.stub().resolves()
        };
        const ui = {
            log: sinon.stub(),
            run: sinon.stub().callsFake(fn => fn())
        };
        const system = {
            getInstance: sinon.stub().returns(instance)
        };

        const command = new RestartCommand(ui, system);
        await command.run();

        expect(instance.isRunning.calledOnce).to.be.true;
        expect(ui.log.called).to.be.false;
        expect(instance.loadRunningEnvironment.calledOnce).to.be.true;
        expect(ui.run.calledOnce).to.be.true;
        expect(instance.restart.calledOnce).to.be.true;
    });
});
