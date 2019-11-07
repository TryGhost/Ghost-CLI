const {expect} = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const {SystemError} = require('../../../lib/errors');

const modulePath = '../../../lib/commands/import';

describe('Unit: Commands > import', function () {
    it('throws error if importing a 0.x import into a > 1.x blog', async function () {
        const parseExport = sinon.stub().returns({version: '0.11.14'});
        const ImportCommand = proxyquire(modulePath, {'../tasks/import': {parseExport}});
        const getInstance = sinon.stub().returns({version: '3.0.0'});

        const cmd = new ImportCommand({}, {getInstance});

        try {
            await cmd.run({file: 'test-output.json'});
        } catch (error) {
            expect(error).to.be.an.instanceof(SystemError);
            expect(error.message).to.include('can only be imported by Ghost v1.x versions');
            expect(getInstance.calledOnce).to.be.true;
            expect(parseExport.calledOnceWithExactly('test-output.json')).to.be.true;
            return;
        }

        expect.fail('expected run to error');
    });

    it('runs import task from v0.x to 1.x if blog is running', async function () {
        const parseExport = sinon.stub().returns({version: '0.11.14'});
        const run = sinon.stub().resolves();
        const importTask = sinon.stub().resolves({run});
        const instance = {
            isRunning: sinon.stub().resolves(true),
            version: '1.0.0'
        };

        const ImportCommand = proxyquire(modulePath, {'../tasks/import': {parseExport, importTask}});
        const getInstance = sinon.stub().returns(instance);

        const cmd = new ImportCommand({ui: true}, {getInstance});

        await cmd.run({file: 'test-output.json'});
        expect(getInstance.calledOnce).to.be.true;
        expect(parseExport.calledOnceWithExactly('test-output.json')).to.be.true;
        expect(instance.isRunning.calledOnce).to.be.true;
        expect(importTask.calledOnceWithExactly({ui: true}, instance, 'test-output.json')).to.be.true;
        expect(run.calledOnce).to.be.true;
    });

    it('runs import task from v1.x to any', async function () {
        const parseExport = sinon.stub().returns({version: '1.0.0'});
        const run = sinon.stub().resolves();
        const importTask = sinon.stub().resolves({run});
        const instance = {
            isRunning: sinon.stub().resolves(true),
            version: '3.0.0'
        };

        const ImportCommand = proxyquire(modulePath, {'../tasks/import': {parseExport, importTask}});
        const getInstance = sinon.stub().returns(instance);

        const cmd = new ImportCommand({ui: true}, {getInstance});

        await cmd.run({file: 'test-output.json'});
        expect(getInstance.calledOnce).to.be.true;
        expect(parseExport.calledOnceWithExactly('test-output.json')).to.be.true;
        expect(instance.isRunning.calledOnce).to.be.true;
        expect(importTask.calledOnceWithExactly({ui: true}, instance, 'test-output.json')).to.be.true;
        expect(run.calledOnce).to.be.true;
    });

    it('prompts to start if not running and throws if not confirmed', async function () {
        const parseExport = sinon.stub().returns({version: '1.0.0'});
        const instance = {
            isRunning: sinon.stub().resolves(false),
            version: '3.0.0'
        };
        const confirm = sinon.stub().resolves(false);

        const ImportCommand = proxyquire(modulePath, {'../tasks/import': {parseExport}});
        const getInstance = sinon.stub().returns(instance);

        const cmd = new ImportCommand({confirm}, {getInstance});

        try {
            await cmd.run({file: 'test-output.json'});
        } catch (error) {
            expect(error).to.be.an.instanceof(SystemError);
            expect(error.message).to.include('not currently running');
            expect(getInstance.calledOnce).to.be.true;
            expect(parseExport.calledOnceWithExactly('test-output.json')).to.be.true;
            expect(instance.isRunning.calledOnce).to.be.true;
            expect(confirm.calledOnce).to.be.true;
            return;
        }

        expect.fail('run should have errored');
    });

    it('prompts to start if not running and starts if confirmed', async function () {
        const parseExport = sinon.stub().returns({version: '1.0.0'});
        const runImport = sinon.stub().resolves();
        const importTask = sinon.stub().resolves({run: runImport});
        const instance = {
            isRunning: sinon.stub().resolves(false),
            checkEnvironment: sinon.stub(),
            start: sinon.stub().resolves(),
            version: '3.0.0'
        };
        const confirm = sinon.stub().resolves(true);
        const run = sinon.stub().callsFake(fn => fn());

        const ImportCommand = proxyquire(modulePath, {'../tasks/import': {parseExport, importTask}});
        const getInstance = sinon.stub().returns(instance);

        const cmd = new ImportCommand({confirm, run}, {getInstance});

        await cmd.run({file: 'test-output.json'});

        expect(getInstance.calledOnce).to.be.true;
        expect(parseExport.calledOnceWithExactly('test-output.json')).to.be.true;
        expect(instance.isRunning.calledOnce).to.be.true;
        expect(confirm.calledOnce).to.be.true;
        expect(instance.checkEnvironment.calledOnce).to.be.true;
        expect(run.calledOnce).to.be.true;
        expect(instance.start.calledOnce).to.be.true;
        expect(importTask.calledOnceWithExactly({confirm, run}, instance, 'test-output.json')).to.be.true;
        expect(runImport.calledOnce).to.be.true;
    });
});
