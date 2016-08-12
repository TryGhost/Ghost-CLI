/* jshint expr:true */
var expect = require('chai').expect,
    chalk = require('chalk'),
    Promise = require('bluebird'),

    streamTestUtils = require('../../utils/stream'),
    UI = require('../../../lib/ui');

describe('Unit: UI', function () {
    it('can be created successfully', function () {
        var ui = new UI();

        expect(ui).to.be.ok;
    });

    describe('#log', function () {
        it('outputs message without color when no color is supplied', function (done) {
            var stdout, ui;

            stdout = streamTestUtils.getWritableStream(function (output) {
                expect(output, 'output exists').to.be.ok;
                expect(chalk.hasColor(output), 'output has color').to.be.false;
                expect(output, 'output value').to.equal('test\n');

                done();
            });
            stdout.on('error', done);

            ui = new UI({stdout: stdout});
            ui.log('test');
        });

        it('outputs message with color when color is supplied', function (done) {
            var stdout, ui;

            stdout = streamTestUtils.getWritableStream(function (output) {
                expect(output, 'output exists').to.be.ok;
                expect(chalk.hasColor(output), 'output has color').to.be.true;
                expect(output, 'output value').to.equal(chalk.green('test') + '\n');

                done();
            });
            stdout.on('error', done);

            ui = new UI({stdout: stdout});
            ui.log('test', 'green');
        });
    });

    it('#success outputs message with correct formatting', function (done) {
        var stdout, ui;

        stdout = streamTestUtils.getWritableStream(function (output) {
            expect(output, 'output exists').to.be.ok;
            expect(chalk.hasColor(output), 'output has color').to.be.true;
            expect(output, 'output value').to.equal(chalk.green('test') + '\n');

            done();
        });
        stdout.on('error', done);

        ui = new UI({stdout: stdout});
        ui.success('test');
    });

    it('#fail outputs message with correct formatting', function (done) {
        var stdout, ui;

        stdout = streamTestUtils.getWritableStream(function (output) {
            expect(output, 'output exists').to.be.ok;
            expect(chalk.hasColor(output), 'output has color').to.be.true;
            expect(output, 'output value').to.equal(chalk.red('test') + '\n');

            done();
        });
        stdout.on('error', done);

        ui = new UI({stdout: stdout});
        ui.fail('test');
    });

    describe('#run', function () {
        var ui;

        before(function () {
            ui = new UI();
        });

        it('correctly passes through promise resolve values', function () {
            var testFunc = new Promise(function (resolve) {
                    resolve('a');
                });

            return ui.run(testFunc).then(function (result) {
                expect(result, 'run result').to.equal('a');
            });
        });

        it('correctly passes through promise reject values', function (done) {
            var testFunc = new Promise(function (resolve, reject) {
                    reject(new Error('something went wrong!'));
                });

            ui.run(testFunc).then(function () {
                done(new Error('then should not be called'));
            }).catch(function reject(error) {
                expect(error, 'run catch error').to.be.ok;
                expect(error, 'run catch error').to.be.an.instanceOf(Error);
                expect(error.message, 'run catch error message').to.equal('something went wrong!');
                done();
            });
        });
    });
});
