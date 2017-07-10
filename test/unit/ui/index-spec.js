'use strict';
const expect = require('chai').expect;
const chalk = require('chalk');
const sinon = require('sinon');
const logSymbols = require('log-symbols');
const streamTestUtils = require('../../utils/stream');
const UI = require('../../../lib/ui');

describe('Unit: UI', function () {
    it('can be created successfully', function () {
        let ui = new UI();

        expect(ui).to.be.ok;
    });

    describe('#log', function () {
        it('outputs message without color when no color is supplied', function (done) {
            let stdout, ui;

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
            let stdout, ui;

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

    describe('#logVerbose', function () {
        it('passes through options to log method when verbose is set', function () {
            let ui = new UI({verbose: true});
            let logStub = sinon.stub(ui, 'log');

            ui.logVerbose('foo', 'green', true);
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0]).to.deep.equal(['foo', 'green', true]);
        });

        it('does not call log when verbose is false', function () {
            let ui = new UI({verbose: false});
            let logStub = sinon.stub(ui, 'log');

            ui.logVerbose('foo', 'green', false);
            expect(logStub.called).to.be.false;
        });
    });

    it('#success outputs message with correct symbols', function (done) {
        let stdout, ui;

        stdout = streamTestUtils.getWritableStream(function (output) {
            expect(output, 'output exists').to.be.ok;
            expect(output, 'output value').to.equal(`${logSymbols.success} test\n`);

            done();
        });
        stdout.on('error', done);

        ui = new UI({stdout: stdout});
        ui.success('test');
    });

    it('#fail outputs message with correct formatting', function (done) {
        let stdout, ui;

        stdout = streamTestUtils.getWritableStream(function (output) {
            expect(output, 'output exists').to.be.ok;
            expect(output, 'output value').to.equal(`${logSymbols.error} test\n`);

            done();
        });
        stdout.on('error', done);

        ui = new UI({stdout: stdout});
        ui.fail('test');
    });

    describe('#run', function () {
        let ui;

        before(function () {
            ui = new UI();
        });

        it('correctly passes through promise resolve values', function () {
            let testFunc = new Promise(function (resolve) {
                resolve('a');
            });

            return ui.run(testFunc).then(function (result) {
                expect(result, 'run result').to.equal('a');
            });
        });

        it('correctly passes through promise reject values', function (done) {
            let testFunc = new Promise(function (resolve, reject) {
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
