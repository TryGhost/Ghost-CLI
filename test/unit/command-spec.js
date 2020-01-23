'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const modulePath = '../../lib/command';

describe('Unit: Command', function () {
    let oldEnv;

    beforeEach(() => {
        oldEnv = process.env.NODE_ENV;
    });

    afterEach(() => {
        sinon.restore();
        process.env.NODE_ENV = oldEnv;
    });

    describe('configure', function () {
        const Command = require(modulePath);

        it('throws if command class doesn\'t have a description', function () {
            const TestCommand = class extends Command {};

            try {
                TestCommand.configure('test', [], {});
                throw new Error('Configure should have thrown');
            } catch (e) {
                expect(e.message).to.match(/^Command test must have a description/);
            }
        });

        it('adds params to command name if params exist', function () {
            const TestCommand = class extends Command {};
            TestCommand.params = '<arg1> [arg2]';
            TestCommand.description = 'a command';
            const commandStub = sinon.stub();
            TestCommand.configure('test', ['t', 'te', 'tes'], {command: commandStub});

            const commandCall = commandStub.args[0][0];

            expect(commandCall.command).to.equal('test <arg1> [arg2]');
            expect(commandCall.describe).to.equal('a command');
            expect(commandCall.aliases).to.deep.equal(['t', 'te', 'tes']);
        });

        it('sets up command builder correctly', function () {
            const TestCommand = class extends Command {};
            TestCommand.configureOptions = sinon.stub().returns({c: 'd'});
            TestCommand.description = 'a command';
            const commandStub = sinon.stub();
            TestCommand.configure('test', [], {command: commandStub});

            const commandCall = commandStub.args[0][0];
            expect(commandCall.builder).to.exist;

            const result = commandCall.builder({a: 'b'});
            expect(TestCommand.configureOptions.calledOnce).to.be.true;
            expect(TestCommand.configureOptions.args[0][0]).to.equal('test');
            expect(TestCommand.configureOptions.args[0][1]).to.deep.equal({a: 'b'});
            expect(result).to.deep.equal({c: 'd'});
        });

        it('calls configureSubcommands if it exists', function () {
            const TestCommand = class extends Command {};
            TestCommand.configureOptions = sinon.stub().returns({a: 'b'});
            TestCommand.configureSubcommands = sinon.stub();
            TestCommand.description = 'a command';
            const commandStub = sinon.stub();
            TestCommand.configure('test', [], {command: commandStub});

            const commandCall = commandStub.args[0][0];
            expect(commandCall.builder).to.exist;

            commandCall.builder();
            expect(TestCommand.configureOptions.calledOnce).to.be.true;
            expect(TestCommand.configureSubcommands.calledOnce).to.be.true;
            expect(TestCommand.configureSubcommands.args[0][0]).to.equal('test');
            expect(TestCommand.configureSubcommands.args[0][1]).to.deep.equal({a: 'b'});
        });

        it('creates a handler map to the _run method', function () {
            const TestCommand = class extends Command {};
            TestCommand.description = 'a command';
            TestCommand._run = sinon.stub();
            const commandStub = sinon.stub();
            TestCommand.configure('test', [], {command: commandStub});

            const commandCall = commandStub.args[0][0];
            expect(commandCall.handler).to.exist;

            commandCall.handler({a: 'b'});
            expect(TestCommand._run.calledOnce).to.be.true;
            expect(TestCommand._run.args[0][0]).to.equal('test');
            expect(TestCommand._run.args[0][1]).to.deep.equal({a: 'b'});
        });
    });

    describe('configureOptions', function () {
        const Command = require(modulePath);

        it('adds usage if a longDescription exists', function () {
            const TestCommand = class extends Command {};
            TestCommand.longDescription = 'a long description here';
            const usageStub = sinon.stub();
            const epilogueStub = sinon.stub();

            TestCommand.configureOptions('test', {usage: usageStub, epilogue: epilogueStub});
            expect(usageStub.calledOnce).to.be.true;
            expect(epilogueStub.calledOnce).to.be.true;
            expect(usageStub.args[0][0]).to.equal('a long description here');
        });

        it('doesn\'t add options if no options defined', function () {
            const TestCommand = class extends Command {};
            const optionStub = sinon.stub();
            const epilogueStub = sinon.stub();

            TestCommand.configureOptions('test', {option: optionStub, epilogue: epilogueStub});
            expect(optionStub.called).to.be.false;
            expect(epilogueStub.calledOnce).to.be.true;
        });

        it('calls option once for each option defined', function () {
            const TestCommand = class extends Command {};
            TestCommand.options = {
                flag: {
                    alias: 'f',
                    description: 'a flag'
                },
                camelCase: {
                    alias: 'c',
                    description: 'test kebab-case'
                }
            };
            const yargsStub = {};
            const optionStub = sinon.stub().returns(yargsStub);
            const epilogueStub = sinon.stub();
            yargsStub.option = optionStub;
            yargsStub.epilogue = epilogueStub;

            const result = TestCommand.configureOptions('test', yargsStub);

            expect(epilogueStub.calledOnce).to.be.true;
            expect(optionStub.calledTwice).to.be.true;
            expect(optionStub.args[0][0]).to.equal('flag');
            expect(optionStub.args[0][1]).to.deep.equal({alias: 'f', description: 'a flag'});
            expect(optionStub.args[1][0]).to.equal('camel-case');
            expect(optionStub.args[1][1]).to.deep.equal({alias: 'c', description: 'test kebab-case'});
            expect(result).to.deep.equal(yargsStub);
        });

        it('skips adding epilogue and usage if onlyOptions is true', function () {
            const TestCommand = class extends Command {};
            TestCommand.options = {
                flag: {
                    alias: 'f',
                    description: 'a flag'
                }
            };
            TestCommand.longDescription = 'LONG DESCRIPTION';
            const yargsStub = {};
            const optionStub = sinon.stub().returns(yargsStub);
            const epilogueStub = sinon.stub();
            const usageStub = sinon.stub();
            yargsStub.option = optionStub;
            yargsStub.epilogue = epilogueStub;

            const result = TestCommand.configureOptions('test', yargsStub, [], true);

            expect(epilogueStub.called).to.be.false;
            expect(usageStub.called).to.be.false;
            expect(optionStub.calledOnce).to.be.true;
            expect(optionStub.args[0]).to.deep.equal(['flag', {alias: 'f', description: 'a flag'}]);
            expect(result).to.deep.equal(yargsStub);
        });
    });

    describe('_run', function () {
        it('calls findValidInstall when global option is not set', async function () {
            const findValidInstall = sinon.stub();
            const Command = proxyquire(modulePath, {
                './utils/find-valid-install': findValidInstall
            });

            const TestCommand = class extends Command {};
            findValidInstall.throws();

            try {
                await TestCommand._run('test', {});
                throw new Error('findValidInstall not called');
            } catch (e) {
                expect(e.message).to.not.equal('findValidInstall not called');
                expect(findValidInstall.calledOnce).to.be.true;
                expect(findValidInstall.args[0][0]).to.equal('test');
            }
        });

        it('will not run command when executed as root user', async function () {
            const checkRootUserStub = sinon.stub();
            const Command = proxyquire(modulePath, {
                './utils/check-root-user': checkRootUserStub
            });

            const TestCommand = class extends Command {};
            TestCommand.global = true;

            checkRootUserStub.throws();

            try {
                await TestCommand._run('test');
            } catch (e) {
                expect(e).to.exist;
                expect(checkRootUserStub.calledOnce).to.be.true;
            }
        });

        it('doesn\'t check for root when command allows root', async function () {
            const checkRootUserStub = sinon.stub().throws('let them be freeee');
            class ShortCircuit {
                constructor() {
                    throw new Error('you shall not pass');
                }
            }
            const Command = proxyquire(modulePath, {
                './utils/check-root-user': checkRootUserStub,
                './system': ShortCircuit
            });

            const TestCommand = class extends Command {};
            TestCommand.global = true;
            TestCommand.allowRoot = true;

            try {
                await TestCommand._run('test', {dir: '.'});
            } catch (e) {
                expect(e).to.exist;
                expect(e.message).to.equal('you shall not pass');
                expect(checkRootUserStub.calledOnce).to.be.false;
            }
        });

        it('Changes directory if needed', async function () {
            sinon.stub(process, 'exit').throws(new Error('exit_stub'));
            const outStub = sinon.stub(process.stderr, 'write');
            const chdirStub = sinon.stub(process, 'chdir').throws(new Error('chdir_stub'));
            const Command = require(modulePath);
            class TestCommand extends Command {}

            try {
                await TestCommand._run('test', {dir: '/path/to/ghost', verbose: true});
                throw new Error('Should have errored');
            } catch (error) {
                expect(error).to.be.ok;
                expect(error.message).to.equal('exit_stub');
                expect(chdirStub.calledOnce).to.be.true;
                expect(chdirStub.args[0][0]).to.equal('/path/to/ghost');
                expect(outStub.calledOnce).to.be.true;
                expect(outStub.args[0][0]).to.match(/chdir_stub/);
            }
        });

        it('Creates & changes into directory if needed', async function () {
            sinon.stub(process.stderr, 'write');
            sinon.stub(process, 'exit').throws(new Error('exit_stub'));
            sinon.stub(process, 'chdir').throws(new Error('chdir_stub'));
            const fs = require('fs-extra');
            const fsStub = sinon.stub(fs, 'ensureDirSync');
            const Command = require(modulePath);
            class TestCommand extends Command {}
            TestCommand.ensureDir = true;

            try {
                await TestCommand._run('test', {dir: '/path/to/ghost', verbose: true});
                throw new Error('Should have errored');
            } catch (error) {
                expect(error).to.be.ok;
                expect(error.message).to.equal('exit_stub');
                expect(fsStub.calledOnce).to.be.true;
                expect(fsStub.args[0][0]).to.equal('/path/to/ghost');
            }
        });

        it('loads system and ui dependencies, calls run method', async function () {
            const run = sinon.stub().callsFake(fn => fn());
            const uiStub = sinon.stub().returns({ui: true, run});
            const setEnvironmentStub = sinon.stub();
            const loadOsInfo = sinon.stub().resolves();
            const systemStub = sinon.stub().returns({setEnvironment: setEnvironmentStub, loadOsInfo});

            const Command = proxyquire(modulePath, {
                './ui': uiStub,
                './system': systemStub
            });

            class TestCommand extends Command {}
            TestCommand.global = true;

            const runStub = sinon.stub(TestCommand.prototype, 'run');

            await TestCommand._run('test', {
                verbose: true,
                prompt: true,
                development: true,
                auto: false
            }, [{extensiona: true}]);
            expect(uiStub.calledOnce).to.be.true;
            expect(uiStub.calledWithExactly({
                verbose: true,
                allowPrompt: true,
                auto: false
            })).to.be.true;
            expect(setEnvironmentStub.calledOnce).to.be.true;
            expect(setEnvironmentStub.calledWithExactly(true, true)).to.be.true;
            expect(systemStub.calledOnce).to.be.true;
            expect(systemStub.calledWithExactly({ui: true, run}, [{extensiona: true}])).to.be.true;
            expect(run.calledOnce).to.be.true;
            expect(loadOsInfo.calledOnce).to.be.true;
            expect(runStub.calledOnce).to.be.true;
            expect(runStub.calledWithExactly({verbose: true, prompt: true, development: true, auto: false})).to.be.true;
        });

        it('binds cleanup handler if cleanup method is defined', async function () {
            const run = sinon.stub().callsFake(fn => fn());
            const uiStub = sinon.stub().returns({ui: true, run});
            const setEnvironmentStub = sinon.stub();
            const loadOsInfo = sinon.stub().resolves();
            const systemStub = sinon.stub().returns({setEnvironment: setEnvironmentStub, loadOsInfo});

            const Command = proxyquire(modulePath, {
                './ui': uiStub,
                './system': systemStub
            });

            class TestCommand extends Command {
                cleanup() {}
            }
            TestCommand.global = true;

            const runStub = sinon.stub(TestCommand.prototype, 'run');
            const onStub = sinon.stub(process, 'on').returnsThis();
            process.env.NODE_ENV = 'development';

            await TestCommand._run('test', {
                verbose: false,
                prompt: false,
                development: false,
                auto: true
            }, [{extensiona: true}]);
            expect(uiStub.calledOnce).to.be.true;
            expect(uiStub.calledWithExactly({
                verbose: false,
                allowPrompt: false,
                auto: true
            })).to.be.true;
            expect(setEnvironmentStub.calledOnce).to.be.true;
            expect(setEnvironmentStub.calledWithExactly(true, true)).to.be.true;
            expect(systemStub.calledOnce).to.be.true;
            expect(systemStub.calledWithExactly({ui: true, run}, [{extensiona: true}])).to.be.true;
            expect(run.calledOnce).to.be.true;
            expect(loadOsInfo.calledOnce).to.be.true;
            expect(runStub.calledOnce).to.be.true;
            expect(runStub.calledWithExactly({verbose: false, prompt: false, development: false, auto: true})).to.be.true;
            expect(onStub.calledThrice).to.be.true;
            expect(onStub.calledWith('SIGINT')).to.be.true;
            expect(onStub.calledWith('SIGTERM')).to.be.true;
            expect(onStub.calledWith('exit')).to.be.true;
        });

        it('runs updateCheck if checkVersion property is true on command class', async function () {
            const run = sinon.stub().callsFake(fn => fn());
            const uiStub = sinon.stub().returns({ui: true, run});
            const setEnvironmentStub = sinon.stub();
            const loadOsInfo = sinon.stub().resolves();
            const systemStub = sinon.stub().returns({setEnvironment: setEnvironmentStub, loadOsInfo});
            const preChecksStub = sinon.stub().resolves();

            const Command = proxyquire(modulePath, {
                './ui': uiStub,
                './system': systemStub,
                './utils/pre-checks': preChecksStub
            });

            class TestCommand extends Command {}
            TestCommand.global = true;
            TestCommand.runPreChecks = true;

            const runStub = sinon.stub(TestCommand.prototype, 'run');
            process.env.NODE_ENV = 'development';

            await TestCommand._run('test', {
                verbose: false,
                prompt: false,
                development: false,
                auto: false
            }, [{extensiona: true}]);
            expect(uiStub.calledOnce).to.be.true;
            expect(uiStub.calledWithExactly({
                verbose: false,
                allowPrompt: false,
                auto: false
            })).to.be.true;
            expect(setEnvironmentStub.calledOnce).to.be.true;
            expect(setEnvironmentStub.calledWithExactly(true, true)).to.be.true;
            expect(systemStub.calledOnce).to.be.true;
            expect(systemStub.calledWithExactly({ui: true, run}, [{extensiona: true}])).to.be.true;
            expect(run.calledOnce).to.be.true;
            expect(loadOsInfo.calledOnce).to.be.true;
            expect(preChecksStub.calledOnce).to.be.true;
            expect(preChecksStub.calledWithExactly({ui: true, run}, {setEnvironment: setEnvironmentStub, loadOsInfo})).to.be.true;
            expect(runStub.calledOnce).to.be.true;
            expect(runStub.calledWithExactly({verbose: false, prompt: false, development: false, auto: false})).to.be.true;
        });

        it('catches errors, passes them to ui error method, then exits', async function () {
            const run = sinon.stub().callsFake(fn => fn());
            const errorStub = sinon.stub();
            const uiStub = sinon.stub().returns({error: errorStub, run});
            const loadOsInfo = sinon.stub().resolves();
            const setEnvironmentStub = sinon.stub();
            const systemStub = sinon.stub().returns({setEnvironment: setEnvironmentStub, loadOsInfo});

            const Command = proxyquire(modulePath, {
                './ui': uiStub,
                './system': systemStub
            });

            class TestCommand extends Command {
                run() {
                    throw new Error('an error occurred');
                }
            }
            TestCommand.global = true;

            const runStub = sinon.spy(TestCommand.prototype, 'run');
            process.env.NODE_ENV = 'production';
            const exitStub = sinon.stub(process, 'exit');

            await TestCommand._run('test', {
                verbose: false,
                prompt: false,
                development: false,
                auto: false
            }, [{extensiona: true}]);
            expect(uiStub.calledOnce).to.be.true;
            expect(uiStub.calledWithExactly({
                verbose: false,
                allowPrompt: false,
                auto: false
            })).to.be.true;
            expect(setEnvironmentStub.calledOnce).to.be.true;
            expect(setEnvironmentStub.calledWithExactly(false, true)).to.be.true;
            expect(systemStub.calledOnce).to.be.true;
            expect(systemStub.calledWithExactly({error: errorStub, run}, [{extensiona: true}])).to.be.true;
            expect(run.calledOnce).to.be.true;
            expect(loadOsInfo.calledOnce).to.be.true;
            expect(runStub.calledOnce).to.be.true;
            expect(runStub.calledWithExactly({verbose: false, prompt: false, development: false, auto: false})).to.be.true;
            expect(errorStub.calledOnce).to.be.true;
            expect(exitStub.calledOnce).to.be.true;
        });
    });

    it('base run method throws error', async function () {
        const Command = require(modulePath);
        class TestCommand extends Command {}
        const commandInstance = new TestCommand({}, {});

        try {
            await commandInstance.run();
            throw new Error('should not be thrown');
        } catch (e) {
            expect(e.message).to.equal('Command must implement run function');
        }
    });

    describe('runCommand', function () {
        const Command = require(modulePath);

        it('errors if CommandClass does not extend Command', async function () {
            class TestCommand extends Command {}
            class BadCommand {}

            const newInstance = new TestCommand({}, {});

            try {
                await newInstance.runCommand(BadCommand, {});
                expect(false, 'error should have been thrown').to.be.true;
            } catch (error) {
                expect(error.message).to.match(/does not extend the Command class/);
            }
        });

        it('instantiates and runs other command class', async function () {
            class TestCommand extends Command {}
            class Test2Command extends Command {
                run() {
                    return;
                }
            }

            const runSpy = sinon.spy(Test2Command.prototype, 'run');
            const testInstance = new TestCommand({}, {});

            await testInstance.runCommand(Test2Command, {argv: true});
            expect(runSpy.calledOnce).to.be.true;
            expect(runSpy.calledWithExactly({argv: true})).to.be.true;
        });

        it('defaults to empty object if argv is not passed', async function () {
            class TestCommand extends Command {}
            class Test2Command extends Command {
                run() {
                    return;
                }
            }

            const runSpy = sinon.spy(Test2Command.prototype, 'run');
            const testInstance = new TestCommand({}, {});

            await testInstance.runCommand(Test2Command);
            expect(runSpy.calledOnce).to.be.true;
            expect(runSpy.calledWithExactly({})).to.be.true;
        });
    });
});
