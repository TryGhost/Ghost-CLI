const {expect} = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const {SystemError} = require('../../../lib/errors');

const modulePath = '../../../lib/commands/export';

describe('Unit: Commands > export', function () {
    it('runs export task if instance is running', async function () {
        const exportTask = sinon.stub().resolves();
        const instance = {
            isRunning: sinon.stub().resolves(true)
        };
        const ui = {
            run: sinon.stub().callsFake(fn => fn()),
            log: sinon.stub()
        };
        const getInstance = sinon.stub().returns(instance);

        const ExportCommand = proxyquire(modulePath, {'../tasks/import': {exportTask}});
        const cmd = new ExportCommand(ui, {getInstance});

        await cmd.run({file: 'test-output.json'});
        expect(getInstance.calledOnce).to.be.true;
        expect(instance.isRunning.calledOnce).to.be.true;
        expect(ui.run.calledOnce).to.be.true;
        expect(exportTask.calledOnceWithExactly(ui, instance, 'test-output.json')).to.be.true;
        expect(ui.log.calledOnce).to.be.true;
    });

    it('prompts to start if not running and throws if not confirmed', async function () {
        const exportTask = sinon.stub().resolves();
        const instance = {
            isRunning: sinon.stub().resolves(false)
        };
        const ui = {
            confirm: sinon.stub().resolves(false),
            run: sinon.stub().callsFake(fn => fn()),
            log: sinon.stub()
        };
        const getInstance = sinon.stub().returns(instance);

        const ExportCommand = proxyquire(modulePath, {'../tasks/import': {exportTask}});
        const cmd = new ExportCommand(ui, {getInstance});

        try {
            await cmd.run({file: 'test-output.json'});
        } catch (error) {
            expect(error).to.be.an.instanceof(SystemError);
            expect(error.message).to.include('not currently running');
            expect(getInstance.calledOnce).to.be.true;
            expect(instance.isRunning.calledOnce).to.be.true;
            expect(ui.confirm.calledOnce).to.be.true;
            expect(ui.run.called).to.be.false;
            expect(exportTask.called).to.be.false;
            expect(ui.log.called).to.be.false;
            return;
        }

        expect.fail('run should have errored');
    });

    it('prompts to start if not running and starts if confirmed', async function () {
        const exportTask = sinon.stub().resolves();
        const instance = {
            isRunning: sinon.stub().resolves(false),
            start: sinon.stub().resolves(),
            checkEnvironment: sinon.stub()
        };
        const ui = {
            confirm: sinon.stub().resolves(true),
            run: sinon.stub().callsFake(fn => fn()),
            log: sinon.stub()
        };
        const getInstance = sinon.stub().returns(instance);

        const ExportCommand = proxyquire(modulePath, {'../tasks/import': {exportTask}});
        const cmd = new ExportCommand(ui, {getInstance});

        await cmd.run({file: 'test-output.json'});
        expect(getInstance.calledOnce).to.be.true;
        expect(instance.isRunning.calledOnce).to.be.true;
        expect(ui.confirm.calledOnce).to.be.true;
        expect(instance.checkEnvironment.calledOnce).to.be.true;
        expect(ui.run.calledTwice).to.be.true;
        expect(instance.start.calledOnce).to.be.true;
        expect(exportTask.calledOnceWithExactly(ui, instance, 'test-output.json')).to.be.true;
        expect(ui.log.calledOnce).to.be.true;
    });
});
