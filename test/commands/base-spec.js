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
});
