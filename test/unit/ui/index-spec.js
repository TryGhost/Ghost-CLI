'use strict';
const expect = require('chai').expect;
const chalk = require('chalk');
const hasAnsi = require('has-ansi');
const stripAnsi = require('strip-ansi');
const sinon = require('sinon');
const logSymbols = require('log-symbols');
const streamTestUtils = require('../../utils/stream');
const UI = require('../../../lib/ui');

describe('Unit: UI', function () {
    it('can be created successfully', function () {
        const ui = new UI();

        expect(ui).to.be.ok;
    });

    describe('#log', function () {
        it('outputs message without color when no color is supplied', function (done) {
            const stdout = streamTestUtils.getWritableStream(function (output) {
                expect(output, 'output exists').to.be.ok;
                expect(hasAnsi(output), 'output has color').to.be.false;
                expect(output, 'output value').to.equal('test\n');

                done();
            });
            stdout.on('error', done);

            const ui = new UI({stdout: stdout});
            ui.log('test');
        });

        it('outputs message with color when color is supplied', function (done) {
            const stdout = streamTestUtils.getWritableStream(function (output) {
                expect(output, 'output exists').to.be.ok;
                expect(hasAnsi(output), 'output has color').to.be.true;
                expect(output, 'output value').to.equal(chalk.green('test') + '\n');

                done();
            });
            stdout.on('error', done);

            const ui = new UI({stdout: stdout});
            ui.log('test', 'green');
        });

        it('outputs message to proper stream', function (done) {
            const ctx = {
                stdout: {write: sinon.stub()},
                stderr: {write: sinon.stub()}
            };
            const ui = new UI();

            ui.log.bind(ctx)('Error', null, true);
            ui.log.bind(ctx)('Good', null, false);

            expect(ctx.stdout.write.calledOnce).to.be.true;
            expect(ctx.stderr.write.calledOnce).to.be.true;
            expect(ctx.stderr.write.getCall(0).args[0]).to.equal('Error\n');
            expect(ctx.stdout.write.getCall(0).args[0]).to.equal('Good\n');

            done();
        });

        it('resets spinner', function (done) {
            const ui = new UI();
            const write = sinon.stub()
            const ctx = {
                spinner: {
                    stop: sinon.stub(),
                    paused: false,
                    start: sinon.stub()
                },
                stdout: {write}
            };

            ui.log.bind(ctx)('test');
            ui.log.bind({stdout: {write}})('best');

            expect(ctx.spinner.stop.calledOnce).to.be.true;
            expect(ctx.spinner.start.calledOnce).to.be.true;
            expect(write.calledTwice).to.be.true;
            expect(write.getCall(0).args[0]).to.equal('test\n');
            expect(write.getCall(1).args[0]).to.equal('best\n');

            done();
        });
    });

    describe('#logVerbose', function () {
        it('passes through options to log method when verbose is set', function () {
            const ui = new UI({verbose: true});
            const logStub = sinon.stub(ui, 'log');

            ui.logVerbose('foo', 'green', true);
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0]).to.deep.equal(['foo', 'green', true]);
        });

        it('does not call log when verbose is false', function () {
            const ui = new UI({verbose: false});
            const logStub = sinon.stub(ui, 'log');

            ui.logVerbose('foo', 'green', false);
            expect(logStub.called).to.be.false;
        });
    });

    it('#success outputs message with correct symbols', function (done) {
        const stdout = streamTestUtils.getWritableStream(function (output) {
            expect(output, 'output exists').to.be.ok;
            expect(output, 'output value').to.equal(`${logSymbols.success} test\n`);

            done();
        });
        stdout.on('error', done);

        const ui = new UI({stdout: stdout});
        ui.success('test');
    });

    it('#fail outputs message with correct formatting', function (done) {
        const stdout = streamTestUtils.getWritableStream(function (output) {
            expect(output, 'output exists').to.be.ok;
            expect(output, 'output value').to.equal(`${logSymbols.error} test\n`);

            done();
        });
        stdout.on('error', done);

        const ui = new UI({stdout: stdout});
        ui.fail('test');
    });

    describe('#run', function () {
        let ui;

        before(function () {
            ui = new UI();
        });

        it('correctly passes through promise resolve values', function () {
            const testFunc = new Promise(function (resolve) {
                resolve('a');
            });

            return ui.run(testFunc).then(function (result) {
                expect(result, 'run result').to.equal('a');
            });
        });

        it('correctly passes through promise reject values', function (done) {
            const testFunc = new Promise(function (resolve, reject) {
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

        it('quietly calls a function', function (done) {
            const testFun = sinon.stub().returns('Shh');
            ui.run(testFun, null, {quiet: true}).then((resolver) => {
                expect(testFun.calledOnce, 'Function called').to.be.true;
                expect(resolver, 'Returned proper values').to.equal('Shh');
                done();
            });
        });

        it('quietly returns a value', function (done) {
            const testRet = {data: 'test'};
            ui.run(testRet, null, {quiet: true}).then((resolved) => {
                expect(resolved, 'Returned proper values').to.deep.equal(testRet);
                done();
            });
        });
    });

    it('#table creates a pretty looking table', function (done) {
        const ui = new UI();
        const ctx = {log: sinon.stub()};
        const expectTable = [
            '┌───┬───┬───┐',
            '│ a │ b │ c │',
            '├───┼───┼───┤',
            '│ d │ e │ f │',
            '├───┼───┼───┤',
            '│ g │ h │ i │',
            '├───┼───┼───┤',
            '│ j │ k │ l │',
            '└───┴───┴───┘'
        ];

        ui.table.bind(ctx)(['a','b','c'], [['d','e','f'], ['g','h','i'], ['j','k','l']]);

        expect(ctx.log.calledOnce).to.be.true;

        // Clear out all of the escape characters and split by line
        const actualTable = stripAnsi(ctx.log.getCall(0).args[0]).split(/\n/);
        expect(actualTable).to.deep.equal(expectTable);

        done();
    });

    describe('#prompt', function () {
        let ui;

        before(function () {
            ui = new UI();
        });

        it('fails when prompting is disabled', function (done) {
            const ctx = {
                allowPrompt: false,
                noSpin: sinon.stub()
            };
            try {
                ui.prompt.bind(ctx)({
                    name: 'test',
                    type: 'input',
                    message: 'Enter anything'
                });
                expect(false, 'An error should have been thrown').to.be.true;
                done();
            } catch (error) {
                expect(ctx.noSpin.called).to.be.false;
                expect(error.message).to.match(/Prompts have been disabled/);
                done();
            }
        });

        it('passes through options to prompt method', function (done) {
            const ctx = {
                allowPrompt: true,
                noSpin: sinon.stub().callsFake(run => run()),
                inquirer: sinon.stub().callsFake((prompts) => prompts)
            };
            const prompt = {
                name: 'test',
                type: 'input',
                message: 'Enter anything'
            };

            ui.prompt.bind(ctx)(prompt);

            expect(ctx.inquirer.called).to.be.true;
            expect(ctx.noSpin.calledOnce).to.be.true;

            done();
        });
    });

    it('#confirm calls prompt', function (done) {
        const ui = new UI();
        const ctx = {prompt: sinon.stub()};
        const testA = {
            type: 'confirm',
            name: 'yes',
            message: 'Is the sky blue',
            default: 'yes'
        };
        const testB = {
            type: 'confirm',
            name: 'yes',
            message: 'Is ghost just a blogging platform',
            default: undefined
        };

        ui.confirm.bind(ctx)('Is the sky blue', 'yes');
        ui.confirm.bind(ctx)('Is ghost just a blogging platform');

        expect(ctx.prompt.calledTwice).to.be.true;
        expect(ctx.prompt.getCall(0).args[0]).to.deep.equal(testA);
        expect(ctx.prompt.getCall(1).args[0]).to.deep.equal(testB);
        done();
    });

    describe('#error', function () {
        // @todo: finish and fix this
        let ui;

        before(function() {
            ui = new UI();
        });

        describe('Handles cliError', function () {
            const errors = require('../../../lib/errors');
            it('verbose', function (done) {
                const system = {writeErrorLog: sinon.stub()};
                const ctx = {
                    verbose: true,
                    log: sinon.stub(),
                    _formatDebug: sinon.stub().returns('cherries')
                };

                const errs = [new errors.ConfigError('bananas'), new errors.CliError({message:'Bad Stack',logToFile:true})];

                errs.forEach((err) => {
                    ui.error.bind(ctx)(err, system);
                });

                expect(ctx.log.called).to.be.true;
                expect(ctx._formatDebug.calledTwice).to.be.true;
                expect(system.writeErrorLog.calledOnce).to.be.true;
                expect(ctx.log.getCall(0).args[0]).to.match(/Config/);
                expect(ctx.log.getCall(1).args[0]).to.equal(errs[0].toString(true));
                expect(ctx.log.getCall(2).args[0]).to.equal('cherries');
                expect(ctx.log.getCall(3).args[0]).to.match(/https:\/\/docs\.ghost\.org\//);
                expect(ctx.log.getCall(4).args[0]).to.match(/Cli/);
                expect(ctx.log.getCall(5).args[0]).to.equal(errs[1].toString(true));
                expect(ctx.log.getCall(6).args[0]).to.equal('cherries');
                expect(ctx.log.getCall(7).args[0]).to.match(/Additional log info/);

                done();
            });

            it('non-verbose', function (done) {
                const system = {writeErrorLog: sinon.stub()};
                const ctx = {
                    verbose: false,
                    log: sinon.stub(),
                    _formatDebug: sinon.stub().returns('cherries')
                };

                const errs = [new errors.ConfigError('bananas'), new errors.CliError({message:'Bad Stack',logToFile:true})];

                errs.forEach((err) => {
                    ui.error.bind(ctx)(err, system);
                });

                sinon.assert.callCount(ctx.log,9);
                expect(ctx._formatDebug.calledTwice).to.be.true;
                expect(system.writeErrorLog.calledOnce).to.be.true;
                expect(ctx.log.getCall(0).args[0]).to.match(/Config/);
                expect(ctx.log.getCall(1).args[0]).to.equal(errs[0].toString(false));
                expect(ctx.log.getCall(2).args[0]).to.equal('cherries');
                expect(ctx.log.getCall(3).args[0]).to.match(/https:\/\/docs\.ghost\.org\//);
                expect(ctx.log.getCall(4).args[0]).to.match(/Cli/);
                expect(ctx.log.getCall(5).args[0]).to.equal(errs[1].toString(false));
                expect(ctx.log.getCall(6).args[0]).to.equal('cherries');
                expect(ctx.log.getCall(7).args[0]).to.match(/Additional log info/);

                done();
            });

        });

        describe('handles generic errors', function () {
            it('verbosly', function (done) {
                const system = {writeErrorLog: sinon.stub()};
                const ctx = {
                    verbose: true,
                    log: sinon.stub(),
                    _formatDebug: sinon.stub()
                };
                const errs = [new Error('Error 1'), new Error('Error 2'), new Error('Error 3'), new Error('Error 4')];
                errs[0].code = 404;
                errs[1].path = "/var/www/ghost/index.js";
                errs[2].stack = null;

                errs.forEach(function (err) {
                    ui.error.bind(ctx)(err, system);
                });


                const expectedErrors = [
                    `An error occurred.\nMessage: '${errs[0].message}'\n\nStack: ${errs[0].stack}\nCode: ${errs[0].code}\n`.split('\n'),
                    `An error occurred.\nMessage: '${errs[1].message}'\n\nStack: ${errs[1].stack}\nPath: ${errs[1].path}\n`.split('\n'),
                    `An error occurred.\nMessage: '${errs[2].message}'\n\n`.split('\n'),
                    `An error occurred.\nMessage: '${errs[3].message}'\n\nStack: ${errs[3].stack}\n`.split('\n')
                ];
                // Log is called 4 times per run
                sinon.assert.callCount(ctx.log, 16);
                sinon.assert.callCount(ctx._formatDebug, 4);
                sinon.assert.callCount(system.writeErrorLog, 4);
                expectedErrors.forEach(function (err, i) {
                    expect(ctx.log.getCall(i * 4 + 2).args[0]).to.match(/Additional log info/);
                    expect(ctx.log.getCall(i * 4 + 3).args[0]).to.match(/Please refer to https:\/\/docs\.ghost\.org/);
                    expect(stripAnsi(ctx.log.getCall(i * 4).args[0]).split(/\n/)).to.deep.equal(err);
                });
                done();
            });

            it('non-verbose', function (done) {
                const system = {writeErrorLog: sinon.stub()};
                const ctx = {
                    verbose: false,
                    log: sinon.stub(),
                    _formatDebug: sinon.stub()
                };
                const err = new Error('!!!error!!!');
                const expectedError = `An error occurred.\nMessage: '${err.message}'\n\n`.split('\n');

                ui.error.bind(ctx)(err, system);

                sinon.assert.callCount(ctx.log, 4);
                expect(ctx._formatDebug.calledOnce).to.be.true;
                expect(system.writeErrorLog.calledOnce).to.be.true;
                expect(ctx.log.getCall(2).args[0]).to.match(/Additional log info/);
                expect(ctx.log.getCall(3).args[0]).to.match(/Please refer to https:\/\/docs\.ghost\.org/);
                expect(stripAnsi(ctx.log.getCall(0).args[0]).split(/\n/)).to.deep.equal(expectedError);

                done();
            });
        });

        it('handles objects', function (done) {
            const ctx = {log: sinon.stub(), _formatDebug: sinon.stub()};
            const testError = {
                'him': 'her',
                'this': 'that',
                'here': 'there',
                'enough': 'probably'
            };
            const expectedCall = JSON.stringify(testError);

            ui.error.bind(ctx)(testError);

            expect(ctx._formatDebug.calledOnce).to.be.true;
            expect(ctx.log.calledOnce).to.be.true;
            expect(ctx.log.getCall(0).args[0]).to.deep.equal(expectedCall);
            expect(ctx.log.getCall(0).args[2]).to.be.true;

            done();
        });

        it('handles strings', function (done) {
            const ctx = {log: sinon.stub(), _formatDebug: sinon.stub()};
            ui.error.bind(ctx)('That\'s a known issue');

            expect(ctx._formatDebug.calledOnce).to.be.true;
            expect(ctx.log.calledOnce).to.be.true;
            expect(ctx.log.getCall(0).args[0]).to.match(/error occured/);
            expect(ctx.log.getCall(0).args[2]).to.be.true;

            done();
        });
    });
});
