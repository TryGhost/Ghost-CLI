/* jshint expr:true */
var sinon = require('sinon'),
    expect = require('chai').expect,
    rewire = require('rewire'),
    commands = rewire('../../../lib/commands');

describe('Unit: Command: index', function () {
    describe('#buildArguments()', function () {
        var buildArguments = commands.__get__('buildArguments');

        it('builds arguments correctly', function () {
            var command = {
                    name: 'test',
                    arguments: [
                        'arg1',
                        'arg2',
                        {name: 'arg3', optional: true},
                        {name: 'arg4', variadic: true}
                    ]
                },
                argString = buildArguments(command);

            expect(argString).to.match(/^test/);
            expect(argString).to.match(/<arg1>/);
            expect(argString).to.match(/<arg2>/);
            expect(argString).to.match(/\[arg3\]/);
            expect(argString).to.match(/\[arg4\.\.\.\]/);
        });
    });

    describe('#addOptions()', function () {
        var addOptions = commands.__get__('addOptions');

        it('builds options correctly', function () {
            var filterStub = sinon.stub(),
                testOptions, mockOption, currentArgSet;

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

            mockOption = sinon.stub();

            addOptions({
                name: 'test',
                options: testOptions
            }, {
                option: mockOption
            });

            expect(mockOption.callCount).to.equal(testOptions.length);
            expect(mockOption.args).to.have.length(testOptions.length);

            currentArgSet = mockOption.args[0];

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
});
