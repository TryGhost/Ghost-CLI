'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const rewire = require('rewire');
const proxyquire = require('proxyquire').noCallThru();

const modulePath = '../../lib/command';

describe('Unit: Command', function () {
    describe('configure', function () {
        const Command = require(modulePath);

        it('throws if command class doesn\'t have a description', function () {
            const TestCommand = class extends Command {}

            try {
                TestCommand.configure('test', [], {});
                throw new Error('Configure should have thrown');
            } catch (e) {
                expect(e.message).to.match(/^Command test must have a description/);
            }
        });

        it('adds params to command name if params exist', function () {
            const TestCommand = class extends Command {}
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
            const TestCommand = class extends Command {}
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
            const TestCommand = class extends Command {}
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
            const TestCommand = class extends Command {}
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
            const TestCommand = class extends Command {}
            TestCommand.longDescription = 'a long description here';
            const usageStub = sinon.stub();
            const epilogueStub = sinon.stub();

            TestCommand.configureOptions('test', {usage: usageStub, epilogue: epilogueStub});
            expect(usageStub.calledOnce).to.be.true;
            expect(epilogueStub.calledOnce).to.be.true;
            expect(usageStub.args[0][0]).to.equal('a long description here');
        });

        it('doesn\'t add options if no options defined', function () {
            const TestCommand = class extends Command {}
            const optionStub = sinon.stub();
            const epilogueStub = sinon.stub();

            TestCommand.configureOptions('test', {option: optionStub, epilogue: epilogueStub});
            expect(optionStub.called).to.be.false;
            expect(epilogueStub.calledOnce).to.be.true;
        });

        it('calls option once for each option defined', function () {
            const TestCommand = class extends Command {}
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
            const TestCommand = class extends Command {}
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
        const sandbox = sinon.sandbox.create();

        afterEach(function () {
            sandbox.restore();
        });

        it('calls checkValidInstall when global option is not set', function () {
            const checkValidInstall = sandbox.stub();
            const Command = rewire(modulePath);
            Command.__set__('checkValidInstall', checkValidInstall);

            const TestCommand = class extends Command {};
            checkValidInstall.throws();

            try {
                TestCommand._run('test', {});
                throw new Error('checkValidInstall not called');
            } catch (e) {
                expect(e.message).to.not.equal('checkValidInstall not called');
                expect(checkValidInstall.calledOnce).to.be.true;
                expect(checkValidInstall.args[0][0]).to.equal('test');
            }
        });

        it('loads system and ui dependencies, calls run method', function () {
            const uiStub = sandbox.stub().returns({ui: true});
            const setEnvironmentStub = sandbox.stub();
            const systemStub = sandbox.stub().returns({setEnvironment: setEnvironmentStub});

            const Command = proxyquire(modulePath, {
                './ui': uiStub,
                './system': systemStub
            });

            class TestCommand extends Command {}
            TestCommand.global = true;

            const runStub = sandbox.stub(TestCommand.prototype, 'run');

            return TestCommand._run('test', {
                verbose: true,
                prompt: true,
                development: true
            }, [{extensiona: true}]).then(() => {
                expect(uiStub.calledOnce).to.be.true;
                expect(uiStub.calledWithExactly({
                    verbose: true,
                    allowPrompt: true
                })).to.be.true;
                expect(setEnvironmentStub.calledOnce).to.be.true;
                expect(setEnvironmentStub.calledWithExactly(true, true)).to.be.true;
                expect(systemStub.calledOnce).to.be.true;
                expect(systemStub.calledWithExactly({ui: true}, [{extensiona: true}])).to.be.true;
                expect(runStub.calledOnce).to.be.true;
                expect(runStub.calledWithExactly({verbose: true, prompt: true, development: true})).to.be.true;
            });
        });

        it('binds cleanup handler if cleanup method is defined', function () {
            const uiStub = sandbox.stub().returns({ui: true});
            const setEnvironmentStub = sandbox.stub();
            const systemStub = sandbox.stub().returns({setEnvironment: setEnvironmentStub});

            const Command = proxyquire(modulePath, {
                './ui': uiStub,
                './system': systemStub
            });

            class TestCommand extends Command {
                cleanup() {}
            }
            TestCommand.global = true;

            const runStub = sandbox.stub(TestCommand.prototype, 'run');
            const onStub = sandbox.stub(process, 'on').returnsThis();
            const oldEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            return TestCommand._run('test', {
                verbose: false,
                prompt: false,
                development: false
            }, [{extensiona: true}]).then(() => {
                expect(uiStub.calledOnce).to.be.true;
                expect(uiStub.calledWithExactly({
                    verbose: false,
                    allowPrompt: false
                })).to.be.true;
                expect(setEnvironmentStub.calledOnce).to.be.true;
                expect(setEnvironmentStub.calledWithExactly(true, true)).to.be.true;
                expect(systemStub.calledOnce).to.be.true;
                expect(systemStub.calledWithExactly({ui: true}, [{extensiona: true}])).to.be.true;
                expect(runStub.calledOnce).to.be.true;
                expect(runStub.calledWithExactly({verbose: false, prompt: false, development: false})).to.be.true;
                expect(onStub.calledTwice).to.be.true;
                expect(onStub.calledWith('SIGINT')).to.be.true;
                expect(onStub.calledWith('SIGTERM')).to.be.true;

                process.env.NODE_ENV = oldEnv;
            });
        });

        it('catches errors, passes them to ui error method, then exits', function () {
            const errorStub = sandbox.stub();
            const uiStub = sandbox.stub().returns({error: errorStub});
            const setEnvironmentStub = sandbox.stub();
            const systemStub = sandbox.stub().returns({setEnvironment: setEnvironmentStub});

            const Command = proxyquire(modulePath, {
                './ui': uiStub,
                './system': systemStub
            });

            class TestCommand extends Command {
                run() {
                    return Promise.reject(new Error('an error occurred'));
                }
            }
            TestCommand.global = true;

            const runStub = sandbox.spy(TestCommand.prototype, 'run');
            const oldEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            const exitStub = sandbox.stub(process, 'exit');

            return TestCommand._run('test', {
                verbose: false,
                prompt: false,
                development: false
            }, [{extensiona: true}]).then(() => {
                expect(uiStub.calledOnce).to.be.true;
                expect(uiStub.calledWithExactly({
                    verbose: false,
                    allowPrompt: false
                })).to.be.true;
                expect(setEnvironmentStub.calledOnce).to.be.true;
                expect(setEnvironmentStub.calledWithExactly(false, true)).to.be.true;
                expect(systemStub.calledOnce).to.be.true;
                expect(systemStub.calledWithExactly({error: errorStub}, [{extensiona: true}])).to.be.true;
                expect(runStub.calledOnce).to.be.true;
                expect(runStub.calledWithExactly({verbose: false, prompt: false, development: false})).to.be.true;
                expect(errorStub.calledOnce).to.be.true;
                expect(exitStub.calledOnce).to.be.true;

                process.env.NODE_ENV = oldEnv;
            });
        });
    });

    it('base run method throws error', function () {
        const Command = require(modulePath);
        class TestCommand extends Command {}
        const commandInstance = new TestCommand({}, {});

        try {
            commandInstance.run();
            throw new Error('should not be thrown');
        } catch (e) {
            expect(e.message).to.equal('Command must implement run function');
        }
    });

    describe('runCommand', function () {
        const Command = require(modulePath);

        it('errors if CommandClass does not extend Command', function () {
            class TestCommand extends Command {}
            class BadCommand {}

            const newInstance = new TestCommand({}, {});

            return newInstance.runCommand(BadCommand, {}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error.message).to.match(/does not extend the Command class/);
            });
        });

        it('instantiates and runs other command class', function () {
            class TestCommand extends Command {}
            class Test2Command extends Command {
                run() {
                    return;
                }
            }

            const runSpy = sinon.spy(Test2Command.prototype, 'run');
            const testInstance = new TestCommand({}, {});

            return testInstance.runCommand(Test2Command, {argv: true}).then(() => {
                expect(runSpy.calledOnce).to.be.true;
                expect(runSpy.calledWithExactly({argv: true})).to.be.true;
            });
        });

        it('defaults to empty object if argv is not passed', function () {
            class TestCommand extends Command {}
            class Test2Command extends Command {
                run() {
                    return;
                }
            }

            const runSpy = sinon.spy(Test2Command.prototype, 'run');
            const testInstance = new TestCommand({}, {});

            return testInstance.runCommand(Test2Command).then(() => {
                expect(runSpy.calledOnce).to.be.true;
                expect(runSpy.calledWithExactly({})).to.be.true;
            });
        });
    });

    describe('checkValidInstall', function () {
        const sandbox = sinon.sandbox.create();

        afterEach(() => {
            sandbox.restore();
        })

        it('throws error if config.js present', function () {
            const existsStub = sandbox.stub();
            existsStub.withArgs(sinon.match(/config\.js/)).returns(true);
            const Command = proxyquire(modulePath, {
                'fs-extra': {existsSync: existsStub}
            });

            const exitStub = sandbox.stub(process, 'exit').throws();
            const errorStub = sandbox.stub(console, 'error');

            try {
                Command.checkValidInstall('test');
                throw new Error('should not be thrown');
            } catch (e) {
                expect(e.message).to.not.equal('should not be thrown');
                expect(existsStub.calledOnce).to.be.true;
                expect(errorStub.calledOnce).to.be.true;
                expect(exitStub.calledOnce).to.be.true;
                expect(existsStub.args[0][0]).to.match(/config\.js/);
                expect(errorStub.args[0][0]).to.match(/Ghost-CLI only works with Ghost versions >= 1\.0\.0/);
            }
        });

        it('throws error if within a Ghost git clone', function () {
            const existsStub = sandbox.stub();
            const readJsonStub = sandbox.stub();

            existsStub.withArgs(sinon.match(/config\.js/)).returns(false);
            existsStub.withArgs(sinon.match(/package\.json/)).returns(true);
            existsStub.withArgs(sinon.match(/Gruntfile\.js/)).returns(true);
            readJsonStub.returns({name: 'ghost'});


            const Command = proxyquire(modulePath, {
                'fs-extra': {existsSync: existsStub, readJsonSync: readJsonStub}
            });

            const exitStub = sandbox.stub(process, 'exit').throws();
            const errorStub = sandbox.stub(console, 'error');

            try {
                Command.checkValidInstall('test');
                throw new Error('should not be thrown');
            } catch (e) {
                expect(e.message).to.not.equal('should not be thrown');
                expect(existsStub.calledThrice).to.be.true;
                expect(errorStub.calledOnce).to.be.true;
                expect(exitStub.calledOnce).to.be.true;
                expect(existsStub.args[1][0]).to.match(/package\.json/);
                expect(errorStub.args[0][0]).to.match(/Ghost-CLI commands do not work inside of a git clone/);
            }
        });

        it('throws error if above two conditions don\t exit and .ghost-cli file is missing', function () {
            const existsStub = sandbox.stub();

            existsStub.withArgs(sinon.match(/config\.js/)).returns(false);
            existsStub.withArgs(sinon.match(/package\.json/)).returns(false);
            existsStub.withArgs(sinon.match(/\.ghost-cli/)).returns(false);

            const Command = proxyquire(modulePath, {
                'fs-extra': {existsSync: existsStub}
            });

            const exitStub = sandbox.stub(process, 'exit').throws();
            const errorStub = sandbox.stub(console, 'error');

            try {
                Command.checkValidInstall('test');
                throw new Error('should not be thrown');
            } catch (e) {
                expect(e.message).to.not.equal('should not be thrown');
                expect(existsStub.calledThrice).to.be.true;
                expect(errorStub.calledOnce).to.be.true;
                expect(exitStub.calledOnce).to.be.true;
                expect(existsStub.args[2][0]).to.match(/\.ghost-cli/);
                expect(errorStub.args[0][0]).to.match(/Working directory is not a recognisable Ghost installation/);
            }
        });

        it('doesn\'t do anything if all conditions return false', function () {
            const existsStub = sandbox.stub();

            existsStub.withArgs(sinon.match(/config\.js/)).returns(false);
            existsStub.withArgs(sinon.match(/package\.json/)).returns(false);
            existsStub.withArgs(sinon.match(/\.ghost-cli/)).returns(true);

            const Command = proxyquire(modulePath, {
                'fs-extra': {existsSync: existsStub}
            });

            const exitStub = sandbox.stub(process, 'exit').throws();
            const errorStub = sandbox.stub(console, 'error');

            Command.checkValidInstall('test');
            expect(existsStub.calledThrice).to.be.true;
            expect(errorStub.called).to.be.false;
            expect(exitStub.called).to.be.false;
        });
    });
});
