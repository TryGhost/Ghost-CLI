/* jshint expr:true */
var sinon = require('sinon'),
    expect = require('chai').expect,
    unitTestUtils = require('./utils'),
    BaseCommand = require('../../lib/commands/base'),
    MockCommand, mockCommander;

describe('Unit: BaseCommand', function () {
    it('adds basic properties correctly', function () {
        var subject;

        MockCommand = BaseCommand.extend({
            name: 'test',
            description: 'a test description',
            init: unitTestUtils.blankInit
        });

        mockCommander = sinon.stub().returnsThis();

        subject = new MockCommand({
            command: function (arg) {
                expect(arg).to.equal('test');

                return {
                    description: mockCommander,
                    action: sinon.stub().returnsThis()
                };
            }
        });

        expect(mockCommander.calledOnce).to.be.true;
        expect(mockCommander.args).to.have.length(1);
        expect(mockCommander.args[0][0]).to.equal('a test description');
    });

    it('builds arguments correctly', function () {
        var subject, argString;

        MockCommand = BaseCommand.extend({
            name: 'test',
            arguments: [
                'arg1',
                'arg2',
                {name: 'arg3', optional: true},
                {name: 'arg4', variadic: true}
            ],
            init: unitTestUtils.blankInit
        });

        mockCommander = sinon.stub().returns({
            description: sinon.stub().returnsThis(),
            action: sinon.stub().returnsThis()
        });

        subject = new MockCommand({command: mockCommander});

        expect(mockCommander.calledOnce).to.be.true;
        expect(mockCommander.args).to.have.length(1);

        argString = mockCommander.args[0][0];

        expect(argString).to.match(/^test/);
        expect(argString).to.match(/<arg1>/);
        expect(argString).to.match(/<arg2>/);
        expect(argString).to.match(/\[arg3\]/);
        expect(argString).to.match(/\[arg4\.\.\.\]/);
    });

    it('builds options correctly', function () {
        var filterStub = sinon.stub(),
            subject, testOptions, currentArgSet;

        testOptions = [
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

        MockCommand = BaseCommand.extend({
            name: 'test',
            options: testOptions
        });

        mockCommander = sinon.stub();

        subject = new MockCommand({
            command: function (arg) {
                expect(arg).to.equal('test');

                return {
                    description: sinon.stub().returnsThis(),
                    action: sinon.stub().returnsThis(),
                    option: mockCommander
                };
            }
        });

        expect(mockCommander.callCount).to.equal(testOptions.length);
        expect(mockCommander.args).to.have.length(testOptions.length);

        currentArgSet = mockCommander.args[0];

        expect(currentArgSet).to.have.length(2);
        expect(currentArgSet[0]).to.match(/^--option/);
        expect(currentArgSet[0]).to.match(/<value>/);
        expect(currentArgSet[1]).to.equal('');

        currentArgSet = mockCommander.args[1];

        expect(currentArgSet).to.have.length(2);
        expect(currentArgSet[0]).to.match(/^--desc/);
        expect(currentArgSet[0]).to.match(/<value>/);
        expect(currentArgSet[1]).to.equal('some description');

        currentArgSet = mockCommander.args[2];

        expect(currentArgSet).to.have.length(2);
        expect(currentArgSet[0]).to.match(/^-w,/);
        expect(currentArgSet[0]).to.match(/--with-alias/);
        expect(currentArgSet[0]).to.match(/<value>$/);

        currentArgSet = mockCommander.args[3];

        expect(currentArgSet).to.have.length(2);
        expect(currentArgSet[0]).to.match(/^--is-flag$/);

        currentArgSet = mockCommander.args[4];

        expect(currentArgSet).to.have.length(2);
        expect(currentArgSet[0]).to.match(/^--custom-signature/);
        expect(currentArgSet[0]).to.match(/<a>..<b>$/);

        currentArgSet = mockCommander.args[5];

        expect(currentArgSet).to.have.length(2);
        expect(currentArgSet[0]).to.match(/^--optional-opt/);
        expect(currentArgSet[0]).to.match(/\[value\]/);

        currentArgSet = mockCommander.args[6];

        expect(currentArgSet).to.have.length(3);
        expect(currentArgSet[0]).to.match(/^--default/);
        expect(currentArgSet[2]).to.equal('test');

        currentArgSet = mockCommander.args[7];

        expect(currentArgSet).to.have.length(3);
        expect(currentArgSet[0]).to.match(/^--with-filter/);
        expect(currentArgSet[2]).to.equal(filterStub);

        currentArgSet = mockCommander.args[8];

        expect(currentArgSet).to.have.length(4);
        expect(currentArgSet[0]).to.match(/^--filter-default/);
        expect(currentArgSet[2]).to.equal(filterStub);
        expect(currentArgSet[3]).to.equal('test');
    });
});
