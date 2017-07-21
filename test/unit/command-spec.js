'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const rewire = require('rewire');

const Command = rewire('../../lib/command');

describe('Unit: Command', function () {
    describe('configure', function () {
        it('throws if command class doesn\'t have a description', function () {
            let TestCommand = class extends Command {}

            try {
                TestCommand.configure('test', [], {});
                throw new Error('Configure should have thrown');
            } catch (e) {
                expect(e.message).to.match(/^Command test must have a description/);
            }
        });

        it('adds params to command name if params exist', function () {
            let TestCommand = class extends Command {}
            TestCommand.params = '<arg1> [arg2]';
            TestCommand.description = 'a command';
            let commandStub = sinon.stub();
            TestCommand.configure('test', ['t', 'te', 'tes'], { command: commandStub });

            let commandCall = commandStub.args[0][0];

            expect(commandCall.command).to.equal('test <arg1> [arg2]');
            expect(commandCall.describe).to.equal('a command');
            expect(commandCall.aliases).to.deep.equal(['t', 'te', 'tes']);
        });

        it('sets up command builder correctly', function () {
            let TestCommand = class extends Command {}
            TestCommand.configureOptions = sinon.stub().returns({c: 'd'});
            TestCommand.description = 'a command';
            let commandStub = sinon.stub();
            TestCommand.configure('test', [], { command: commandStub });

            let commandCall = commandStub.args[0][0];
            expect(commandCall.builder).to.exist;

            let result = commandCall.builder({a: 'b'});
            expect(TestCommand.configureOptions.calledOnce).to.be.true;
            expect(TestCommand.configureOptions.args[0][0]).to.equal('test');
            expect(TestCommand.configureOptions.args[0][1]).to.deep.equal({a: 'b'});
            expect(result).to.deep.equal({c: 'd'});
        });

        it('calls configureSubcommands if it exists', function () {
            let TestCommand = class extends Command {}
            TestCommand.configureOptions = sinon.stub().returns({a: 'b'});
            TestCommand.configureSubcommands = sinon.stub();
            TestCommand.description = 'a command';
            let commandStub = sinon.stub();
            TestCommand.configure('test', [], { command: commandStub });

            let commandCall = commandStub.args[0][0];
            expect(commandCall.builder).to.exist;

            commandCall.builder();
            expect(TestCommand.configureOptions.calledOnce).to.be.true;
            expect(TestCommand.configureSubcommands.calledOnce).to.be.true;
            expect(TestCommand.configureSubcommands.args[0][0]).to.equal('test');
            expect(TestCommand.configureSubcommands.args[0][1]).to.deep.equal({a: 'b'});
        });

        it('creates a handler map to the _run method', function () {
            let TestCommand = class extends Command {}
            TestCommand.description = 'a command';
            TestCommand._run = sinon.stub();
            let commandStub = sinon.stub();
            TestCommand.configure('test', [], { command: commandStub });

            let commandCall = commandStub.args[0][0];
            expect(commandCall.handler).to.exist;

            commandCall.handler({a: 'b'});
            expect(TestCommand._run.calledOnce).to.be.true;
            expect(TestCommand._run.args[0][0]).to.equal('test');
            expect(TestCommand._run.args[0][1]).to.deep.equal({a: 'b'});
        });
    });

    describe('configureOptions', function () {
        it('adds usage if a longDescription exists', function () {
            let TestCommand = class extends Command {}
            TestCommand.longDescription = 'a long description here';
            let usageStub = sinon.stub();
            let epilogueStub = sinon.stub();

            TestCommand.configureOptions('test', { usage: usageStub, epilogue: epilogueStub });
            expect(usageStub.calledOnce).to.be.true;
            expect(epilogueStub.calledOnce).to.be.true;
            expect(usageStub.args[0][0]).to.equal('a long description here');
        });

        it('doesn\'t add options if no options defined', function () {
            let TestCommand = class extends Command {}
            let optionStub = sinon.stub();
            let epilogueStub = sinon.stub();

            TestCommand.configureOptions('test', { option: optionStub, epilogue: epilogueStub });
            expect(optionStub.called).to.be.false;
            expect(epilogueStub.calledOnce).to.be.true;
        });

        it('calls option once for each option defined', function () {
            let TestCommand = class extends Command {}
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
            let yargsStub = {};
            let optionStub = sinon.stub().returns(yargsStub);
            let epilogueStub = sinon.stub();
            yargsStub.option = optionStub;
            yargsStub.epilogue = epilogueStub;

            let result = TestCommand.configureOptions('test', yargsStub);

            expect(epilogueStub.calledOnce).to.be.true;
            expect(optionStub.calledTwice).to.be.true;
            expect(optionStub.args[0][0]).to.equal('flag');
            expect(optionStub.args[0][1]).to.deep.equal({alias: 'f', description: 'a flag'});
            expect(optionStub.args[1][0]).to.equal('camel-case');
            expect(optionStub.args[1][1]).to.deep.equal({alias: 'c', description: 'test kebab-case'});
            expect(result).to.deep.equal(yargsStub);
        });

        it('skips adding epilogue and usage if onlyOptions is true', function () {
            let TestCommand = class extends Command {}
            TestCommand.options = {
                flag: {
                    alias: 'f',
                    description: 'a flag'
                }
            };
            TestCommand.longDescription = 'LONG DESCRIPTION';
            let yargsStub = {};
            let optionStub = sinon.stub().returns(yargsStub);
            let epilogueStub = sinon.stub();
            let usageStub = sinon.stub();
            yargsStub.option = optionStub;
            yargsStub.epilogue = epilogueStub;

            let result = TestCommand.configureOptions('test', yargsStub, [], true);

            expect(epilogueStub.called).to.be.false;
            expect(usageStub.called).to.be.false;
            expect(optionStub.calledOnce).to.be.true;
            expect(optionStub.args[0]).to.deep.equal(['flag', {alias: 'f', description: 'a flag'}]);
            expect(result).to.deep.equal(yargsStub);
        });
    });

    describe('_run', function () {
        let checkValidInstall;
        let restore;

        beforeEach(function () {
            checkValidInstall = sinon.stub();
            restore = Command.__set__('checkValidInstall', checkValidInstall);
        });

        afterEach(function () {
            restore();
        });

        it('calls checkValidInstall when global option is not set', function () {
            let TestCommand = class extends Command {};
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
    });
});
