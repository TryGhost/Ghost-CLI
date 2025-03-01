const {expect} = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const createConfigStub = require('../../utils/config-stub');

const Instance = require('../../../lib/instance');
const System = require('../../../lib/system');
const UI = require('../../../lib/ui');

const modulePath = '../../../lib/commands/start';

function getStubs(dir, environment = undefined, isLocal = false) {
    const ui = new UI({});
    const system = new System(ui, []);
    const instance = new Instance(ui, system, dir);
    instance._config = createConfigStub();

    instance._cliConfig = createConfigStub();
    instance._cliConfig.get.withArgs('name').returns('testing');
    instance._config.environment = environment;
    Object.defineProperty(instance, 'isLocal', {
        get() {
            return isLocal;
        }
    });
    system.environment = environment;

    return {
        ui, system, instance
    };
}

describe('Unit: Commands > Start', function () {
    describe('run', function () {
        const oldArgv = process.argv;
        let StartCommand;
        let returnedInstance;

        beforeEach(function () {
            StartCommand = proxyquire(modulePath, {
                '../utils/get-instance': sinon.stub().callsFake(() => returnedInstance)
            });
        });

        afterEach(() => {
            process.argv = oldArgv;
        });

        it('notifies and exits for already running instance', async function () {
            const {ui, system, instance} = getStubs('/var/www/ghost');
            returnedInstance = instance;
            const isRunning = sinon.stub(instance, 'isRunning').resolves(true);
            const checkEnvironment = sinon.stub(instance, 'checkEnvironment');
            const log = sinon.stub(ui, 'log');
            const run = sinon.stub(ui, 'run').callsFake(fn => fn());
            const start = sinon.stub(instance, 'start').resolves();

            const cmd = new StartCommand(ui, system);
            const runCommand = sinon.stub(cmd, 'runCommand').resolves();

            await cmd.run({});
            expect(isRunning.calledOnce).to.be.true;
            expect(log.calledOnce).to.be.true;

            expect(checkEnvironment.called).to.be.false;
            expect(runCommand.called).to.be.false;
            expect(run.called).to.be.false;
            expect(start.called).to.be.false;
        });

        it('warns of http use in production', async function () {
            const {ui, system, instance} = getStubs('/var/www/ghost', 'production');
            returnedInstance = instance;
            const logStub = sinon.stub(ui, 'log');
            const isRunning = sinon.stub(instance, 'isRunning').resolves(false);
            const checkEnvironment = sinon.stub(instance, 'checkEnvironment');
            instance.config.get.returns('http://localhost:2368');
            const start = new StartCommand(ui, system);
            sinon.stub(start, 'runCommand').rejects(new Error('runCommand'));

            try {
                await start.run({argv: true});
                expect(false, 'Promise should have rejected').to.be.true;
            } catch (error) {
                expect(error.message).to.equal('runCommand');
            }

            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]);
            expect(logStub.args[0][0]).to.include('Using https on all URLs is highly recommended');

            expect(checkEnvironment.calledOnce).to.be.true;
            expect(isRunning.calledOnce).to.be.true;
        });

        it('no warning with ssl in production', async function () {
            const {ui, system, instance} = getStubs('/var/www/ghost', 'production');
            returnedInstance = instance;
            const logStub = sinon.stub(ui, 'log');
            const isRunning = sinon.stub(instance, 'isRunning').resolves(false);
            const checkEnvironment = sinon.stub(instance, 'checkEnvironment');
            instance.config.get.returns('https://demo.ghost.io');
            const start = new StartCommand(ui, system);
            sinon.stub(start, 'runCommand').rejects(new Error('runCommand'));

            try {
                await start.run({argv: true});
            } catch (error) {
                expect(error.message).to.equal('runCommand');
            }

            expect(logStub.called).to.be.false;

            expect(checkEnvironment.calledOnce).to.be.true;
            expect(isRunning.calledOnce).to.be.true;
        });

        it('runs startup checks and starts correctly', async function () {
            const {ui, system, instance} = getStubs('/var/www/ghost');
            returnedInstance = instance;
            const isRunning = sinon.stub(instance, 'isRunning').resolves(false);
            const checkEnvironment = sinon.stub(instance, 'checkEnvironment');
            const log = sinon.stub(ui, 'log');
            const run = sinon.stub(ui, 'run').callsFake(fn => fn());
            const start = sinon.stub(instance, 'start').resolves();

            const cmd = new StartCommand(ui, system);
            const runCommand = sinon.stub(cmd, 'runCommand').resolves();

            instance.config.get.returns('http://localhost:2368');

            await cmd.run({checkMem: false});
            expect(isRunning.calledOnce).to.be.true;
            expect(checkEnvironment.calledOnce).to.be.true;
            expect(runCommand.calledOnce).to.be.true;
            expect(runCommand.args[0][1]).to.deep.equal({
                categories: ['start'],
                local: false,
                quiet: true,
                checkMem: false,
                skipInstanceCheck: true
            });
            expect(run.calledOnce).to.be.true;
            expect(start.calledOnce).to.be.true;
            expect(log.calledTwice).to.be.true;
            expect(instance.config.get.calledTwice).to.be.true;
        });

        it('doesn\'t log if quiet is set to true', async function () {
            const {ui, system, instance} = getStubs('/var/www/ghost');
            returnedInstance = instance;
            const isRunning = sinon.stub(instance, 'isRunning').resolves(false);
            const checkEnvironment = sinon.stub(instance, 'checkEnvironment');
            const log = sinon.stub(ui, 'log');
            const run = sinon.stub(ui, 'run').callsFake(fn => fn());
            const start = sinon.stub(instance, 'start').resolves();

            const cmd = new StartCommand(ui, system);
            const runCommand = sinon.stub(cmd, 'runCommand').resolves();

            await cmd.run({checkMem: false, quiet: true});
            expect(isRunning.calledOnce).to.be.true;
            expect(checkEnvironment.calledOnce).to.be.true;
            expect(runCommand.calledOnce).to.be.true;
            expect(runCommand.args[0][1]).to.deep.equal({
                categories: ['start'],
                local: false,
                quiet: true,
                checkMem: false,
                skipInstanceCheck: true
            });
            expect(run.calledOnce).to.be.true;
            expect(start.calledOnce).to.be.true;
            expect(log.called).to.be.false;
            expect(instance.config.get.called).to.be.false;
        });

        it('sets argv.local based on the process manager (local)', async function () {
            const {ui, system, instance} = getStubs('/var/www/ghost', undefined, true);
            returnedInstance = instance;
            const stopError = new Error('stopError');
            sinon.stub(instance, 'isRunning').throws(stopError);
            const cmd = new StartCommand(ui, system);
            const argv = {};

            try {
                await cmd.run(argv);
            } catch (error) {
                expect(error).to.equal(stopError);
                expect(argv.local).to.be.true;
            }
        });

        it('sets argv.local based on the process manager (not local)', async function () {
            const {ui, system, instance} = getStubs('/var/www/ghost', undefined, false);
            returnedInstance = instance;
            const stopError = new Error('stopError');
            sinon.stub(instance, 'isRunning').throws(stopError);
            const cmd = new StartCommand(ui, system);

            // Example: `ghost update --local` in production
            const argv = {local: true};

            try {
                await cmd.run(argv);
            } catch (error) {
                expect(error).to.equal(stopError);
                expect(argv.local).to.be.false;
            }
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

        const yargs = {option: sinon.stub(), epilogue: () => true, usage: () => true};
        yargs.option.returns(yargs);
        StartCommand.configureOptions.call({options: {}}, 'Test', yargs, extensions, true);
        expect(yargs.option.called).to.be.true;
        expect(yargs.option.args[0][0]).to.equal('test');
        expect(doctorStub.calledOnce).to.be.true;
    });
});
