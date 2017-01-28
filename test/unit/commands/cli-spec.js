'use strict';
const sinon = require('sinon');
const expect = require('chai').expect;
const rewire = require('rewire');
const cli = rewire('../../../lib/cli');
const pkg = require('../../../package.json');

const Command = require('commander').Command;

describe('Unit: cli', function () {
    let sandbox;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('#buildArguments()', function () {
        let buildArguments = cli.__get__('buildArguments');

        it('builds arguments correctly', function () {
            let name = 'test';
            let args = [
                'arg1',
                'arg2',
                {name: 'arg3', optional: true},
                {name: 'arg4', variadic: true}
            ];

            let argString = buildArguments(args, name);

            expect(argString).to.match(/^test/);
            expect(argString).to.match(/<arg1>/);
            expect(argString).to.match(/<arg2>/);
            expect(argString).to.match(/\[arg3\]/);
            expect(argString).to.match(/\[arg4\.\.\.\]/);
        });
    });

    describe('#addOptions()', function () {
        let addOptions = cli.__get__('addOptions');

        it('builds options correctly', function () {
            let filterStub = sinon.stub();

            let testOptions = [
                {name: 'option'},
                {name: 'desc', description: 'some description'},
                {name: 'with-alias', alias: 'w'},
                {name: 'is-flag', flag: true},
                {name: 'custom-signature', signature: '<a>..<b>'},
                {name: 'optional-opt', optional: true},
                {name: 'default', defaultValue: 'test'},
                {name: 'with-filter', filter: filterStub},
                {name: 'filter-default', filter: filterStub, defaultValue: 'test'}
            ];

            let mockOption = sinon.stub();

            addOptions(testOptions, {
                option: mockOption
            });

            expect(mockOption.callCount).to.equal(testOptions.length);
            expect(mockOption.args).to.have.length(testOptions.length);

            let currentArgSet = mockOption.args[0];

            expect(currentArgSet).to.have.length(2);
            expect(currentArgSet[0]).to.match(/^--option/);
            expect(currentArgSet[0]).to.match(/<value>/);
            expect(currentArgSet[1]).to.equal('');

            currentArgSet = mockOption.args[1];

            expect(currentArgSet).to.have.length(2);
            expect(currentArgSet[0]).to.match(/^--desc/);
            expect(currentArgSet[0]).to.match(/<value>/);
            expect(currentArgSet[1]).to.equal('some description');

            currentArgSet = mockOption.args[2];

            expect(currentArgSet).to.have.length(2);
            expect(currentArgSet[0]).to.match(/^-w,/);
            expect(currentArgSet[0]).to.match(/--with-alias/);
            expect(currentArgSet[0]).to.match(/<value>$/);

            currentArgSet = mockOption.args[3];

            expect(currentArgSet).to.have.length(2);
            expect(currentArgSet[0]).to.match(/^--is-flag$/);

            currentArgSet = mockOption.args[4];

            expect(currentArgSet).to.have.length(2);
            expect(currentArgSet[0]).to.match(/^--custom-signature/);
            expect(currentArgSet[0]).to.match(/<a>..<b>$/);

            currentArgSet = mockOption.args[5];

            expect(currentArgSet).to.have.length(2);
            expect(currentArgSet[0]).to.match(/^--optional-opt/);
            expect(currentArgSet[0]).to.match(/\[value\]/);

            currentArgSet = mockOption.args[6];

            expect(currentArgSet).to.have.length(3);
            expect(currentArgSet[0]).to.match(/^--default/);
            expect(currentArgSet[2]).to.equal('test');

            currentArgSet = mockOption.args[7];

            expect(currentArgSet).to.have.length(3);
            expect(currentArgSet[0]).to.match(/^--with-filter/);
            expect(currentArgSet[2]).to.equal(filterStub);

            currentArgSet = mockOption.args[8];

            expect(currentArgSet).to.have.length(4);
            expect(currentArgSet[0]).to.match(/^--filter-default/);
            expect(currentArgSet[2]).to.equal(filterStub);
            expect(currentArgSet[3]).to.equal('test');
        });
    });

    describe('#loadCommands', function () {
        let loadCommands = cli.__get__('loadCommands');
        let buildArguments;
        let addOptions;
        let command;
        let program;
        let reset;

        beforeEach(function () {
            program = new Command();
            buildArguments = sinon.stub().returns('test');
            addOptions = sinon.stub();
            command = new Command();
            sandbox.stub(program, 'command').returns(command);
            reset = cli.__set__({
                buildArguments: buildArguments,
                addOptions: addOptions
            });
        });

        afterEach(function () {
            reset();
        });

        it('correctly passes arguments to buildArguments function', function () {
            let testArgs = ['a', 'b', {name: 'c', optional: true}];
            loadCommands({
                test: {
                    arguments: testArgs
                }
            }, program);

            expect(buildArguments.calledOnce).to.be.true;
            expect(buildArguments.args[0][0]).to.deep.equal(testArgs);
            expect(buildArguments.args[0][1]).to.equal('test');
        });

        it('adds description if one exists', function () {
            let descriptionStub = sandbox.stub(command, 'description');
            let description = 'test description';
            loadCommands({
                test: {description: description}
            }, program);

            expect(descriptionStub.calledOnce).to.be.true;
            expect(descriptionStub.args[0][0]).to.equal(description);
        });

        it('adds alias if one exists', function () {
            let aliasStub = sandbox.stub(command, 'alias');
            let alias = 'a';
            loadCommands({
                test: {alias: alias}
            }, program);

            expect(aliasStub.calledOnce).to.be.true;
            expect(aliasStub.args[0][0]).to.equal(alias);
        });

        it('returns the command object', function () {
            let result = loadCommands({test: {}}, program);

            expect(result).to.be.an('object');
            expect(result.test).to.deep.equal(command);
        });
    });

    describe('#cli', function () {
        let testCommand = {
            help: sinon.stub()
        };
        let loadCommands;
        let program;
        let reset;

        before(function () {
            loadCommands = sinon.stub().returns({
                test: testCommand
            });
            reset = cli.__set__('loadCommands', loadCommands);
        });

        after(function () {
            reset();
        });

        beforeEach(function () {
            program = new Command();
            sandbox.stub(program, 'help');
        });

        it('adds version', function () {
            sandbox.stub(program, 'version');
            cli(['node', 'ghost'], program);

            expect(program.version.calledWith(pkg.version)).to.be.true;
        });

        it('shows help if no command is called', function () {
            cli(['node', 'ghost'], program);
            expect(program.help.calledOnce).to.be.true;
        });

        it('help command works with no arguments', function () {
            cli(['node', 'ghost', 'help'], program);

            expect(program.help.calledOnce).to.be.true;
        });

        it('help command works with invalid command', function () {
            cli(['node', 'ghost', 'help', 'junk'], program);
            expect(program.help.calledOnce).to.be.true;
        });

        it('help command works with existing command', function () {
            cli(['node', 'ghost', 'help', 'test'], program);
            expect(testCommand.help.called).to.be.true;
        });

        it('outputs error message on invalid command', function () {
            let error = sinon.stub();
            let exit = sinon.stub();
            let replace = cli.__set__({
                console: {error: error},
                process: {exit: exit}
            });

            cli(['node', 'ghost', 'nonexistent'], program);

            expect(error.calledOnce).to.be.true;
            expect(error.args[0][0]).to.match(/Command \'nonexistent\' not found/);
            expect(exit.calledOnce).to.be.true;
            expect(exit.args[0][0]).to.equal(1);

            replace();
        });
    });
});
