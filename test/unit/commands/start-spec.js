'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const createConfigStub = require('../../utils/config-stub');

const Instance = require('../../../lib/instance');
const System = require('../../../lib/system');
const UI = require('../../../lib/ui');
const DoctorCommand = require('../../../lib/commands/doctor');

const modulePath = '../../../lib/commands/start';
const StartCommand = require(modulePath);

function getStubs(dir) {
    const ui = new UI({});
    const system = new System(ui, []);
    const instance = new Instance(ui, system, dir);
    instance._config = createConfigStub();

    instance._cliConfig = createConfigStub();
    instance._cliConfig.get.withArgs('name').returns('testing');

    const getInstance = sinon.stub(system, 'getInstance').returns(instance);

    return {
        ui, system, instance, getInstance
    };
}

describe('Unit: Commands > Start', function () {
    describe('run', function () {
        const oldArgv = process.argv;

        afterEach(() => {
            process.argv = oldArgv;
        });

        it('notifies and exits for already running instance', async function () {
            const {ui, system, instance, getInstance} = getStubs('/var/www/ghost');
            const isRunning = sinon.stub(instance, 'isRunning').resolves(true);
            const checkEnvironment = sinon.stub(instance, 'checkEnvironment');
            const log = sinon.stub(ui, 'log');
            const run = sinon.stub(ui, 'run').callsFake(fn => fn());
            const start = sinon.stub(instance, 'start').resolves();

            const cmd = new StartCommand(ui, system);
            const runCommand = sinon.stub(cmd, 'runCommand').resolves();

            await cmd.run({});
            expect(getInstance.calledOnce).to.be.true;
            expect(isRunning.calledOnce).to.be.true;
            expect(log.calledOnce).to.be.true;

            expect(checkEnvironment.called).to.be.false;
            expect(runCommand.called).to.be.false;
            expect(run.called).to.be.false;
            expect(start.called).to.be.false;
        });

        it('runs startup checks and starts correctly', async function () {
            const {ui, system, instance, getInstance} = getStubs('/var/www/ghost');
            const isRunning = sinon.stub(instance, 'isRunning').resolves(false);
            const checkEnvironment = sinon.stub(instance, 'checkEnvironment');
            const log = sinon.stub(ui, 'log');
            const run = sinon.stub(ui, 'run').callsFake(fn => fn());
            const start = sinon.stub(instance, 'start').resolves();

            const cmd = new StartCommand(ui, system);
            const runCommand = sinon.stub(cmd, 'runCommand').resolves();

            instance.config.get.returns('http://localhost:2368');

            await cmd.run({checkMem: false});
            expect(getInstance.calledOnce).to.be.true;
            expect(isRunning.calledOnce).to.be.true;
            expect(checkEnvironment.calledOnce).to.be.true;
            expect(runCommand.calledOnce).to.be.true;
            expect(runCommand.calledWithExactly(DoctorCommand, {
                categories: ['start'],
                quiet: true,
                checkMem: false
            })).to.be.true;
            expect(run.calledOnce).to.be.true;
            expect(start.calledOnce).to.be.true;
            expect(log.calledTwice).to.be.true;
            expect(instance.config.get.calledTwice).to.be.true;
        });

        it('doesn\'t log if quiet is set to true', async function () {
            const {ui, system, instance, getInstance} = getStubs('/var/www/ghost');
            const isRunning = sinon.stub(instance, 'isRunning').resolves(false);
            const checkEnvironment = sinon.stub(instance, 'checkEnvironment');
            const log = sinon.stub(ui, 'log');
            const run = sinon.stub(ui, 'run').callsFake(fn => fn());
            const start = sinon.stub(instance, 'start').resolves();

            const cmd = new StartCommand(ui, system);
            const runCommand = sinon.stub(cmd, 'runCommand').resolves();

            await cmd.run({checkMem: false, quiet: true});
            expect(getInstance.calledOnce).to.be.true;
            expect(isRunning.calledOnce).to.be.true;
            expect(checkEnvironment.calledOnce).to.be.true;
            expect(runCommand.calledOnce).to.be.true;
            expect(runCommand.calledWithExactly(DoctorCommand, {
                categories: ['start'],
                quiet: true,
                checkMem: false
            })).to.be.true;
            expect(run.calledOnce).to.be.true;
            expect(start.calledOnce).to.be.true;
            expect(log.called).to.be.false;
            expect(instance.config.get.called).to.be.false;
        });
    });

    it('configureOptions loops over extensions', function () {
        const doctorStub = sinon.stub().returnsArg(1);
        const StartCommand = proxyquire(modulePath, {
            './doctor': {configureOptions: doctorStub}
        });
        const extensions = [{
            config: {options: {start: {test: true}}}
        }, {}];

        const yargs = {option: sinon.stub(), epilogue: () => true};
        yargs.option.returns(yargs);
        StartCommand.configureOptions.call({options: {}}, 'Test', yargs, extensions, true);
        expect(yargs.option.called).to.be.true;
        expect(yargs.option.args[0][0]).to.equal('test');
        expect(doctorStub.calledOnce).to.be.true;
    });
});
