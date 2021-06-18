'use strict';
const {expect} = require('chai');
const chalk = require('chalk');
const hasAnsi = require('has-ansi');
const stripAnsi = require('strip-ansi');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();
const logSymbols = require('log-symbols');
const streamTestUtils = require('../../utils/stream');
const EventEmitter = require('events');

const execa = require('execa');

const modulePath = '../../../lib/ui';

describe('Unit: UI', function () {
    before(() => {
        // Workaround because GitHub Actions doesn't currently report a TTY
        process.stdout.isTTY = true;
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('constructor', function () {
        const UI = require(modulePath);

        it('works with defaults', function () {
            const ui = new UI();
            expect(ui.stdin).to.equal(process.stdin);
            expect(ui.stdout).to.equal(process.stdout);
            expect(ui.stderr).to.equal(process.stderr);
            expect(ui.verbose).to.be.false;
            expect(ui.allowPrompt).to.be.true;
        });

        it('works with custom options', function () {
            const stdin = {stdin: true};
            const stdout = {stdout: true};
            const stderr = {stderr: true};

            const ui = new UI({
                stdin: stdin,
                stdout: stdout,
                stderr: stderr,
                verbose: true,
                allowPrompt: false
            });

            expect(ui.stdin).to.equal(stdin);
            expect(ui.stdout).to.equal(stdout);
            expect(ui.stderr).to.equal(stderr);
            expect(ui.verbose).to.be.true;
            expect(ui.allowPrompt).to.be.false;
        });

        it('sets allowPrompt to false if process.stdout is not a TTY', function () {
            const stdout = {stdout: true, isTTY: false};
            const ui = new UI({
                allowPrompt: true,
                stdout: stdout
            });

            expect(ui.stdout).to.equal(stdout);
            expect(ui.allowPrompt).to.be.false;
        });
    });

    describe('run', function () {
        const spinner = {
            succeed: sinon.stub(),
            fail: sinon.stub(),
            stop: sinon.stub()
        };

        const startStub = sinon.stub().returns(spinner);
        const oraStub = sinon.stub().returns({start: startStub});
        const UI = proxyquire(modulePath, {
            ora: oraStub
        });

        afterEach(() => {
            spinner.succeed.reset();
            spinner.fail.reset();
            spinner.stop.reset();
            startStub.resetHistory();
            oraStub.resetHistory();
        });

        it('with quiet enabled, resolves a static value', function () {
            const ui = new UI();

            return ui.run('foo', null, {quiet: true}).then((result) => {
                expect(result).to.equal('foo');
                expect(oraStub.called).to.be.false;
            });
        });

        it('with quiet enabled, resolves the result of a function', function () {
            const ui = new UI();
            const testFunc = sinon.stub().resolves('foo');

            return ui.run(testFunc, null, {quiet: true}).then((result) => {
                expect(result).to.equal('foo');
                expect(oraStub.called).to.be.false;
            });
        });

        it('with quiet enabled, passes through rejection', function (done) {
            const ui = new UI();
            const testFunc = sinon.stub().rejects(new Error('something went wrong!'));

            ui.run(testFunc, null, {quiet: true}).then(() => {
                done(new Error('then should not be called'));
            }).catch((error) => {
                expect(error, 'run catch error').to.be.an.instanceOf(Error);
                expect(error.message, 'run catch error message').to.equal('something went wrong!');
                expect(testFunc.calledOnce).to.be.true;
                expect(oraStub.called).to.be.false;
                done();
            }).catch(done);
        });

        it('starts spinner with options, resolves single value', function () {
            const ui = new UI({stdout: {stdout: true}});

            return ui.run('foo', 'do a thing').then((result) => {
                expect(result).to.equal('foo');
                expect(oraStub.calledOnce).to.be.true;
                expect(oraStub.calledWithExactly({
                    text: 'do a thing',
                    spinner: 'hamburger',
                    stream: {stdout: true}
                })).to.be.true;
                expect(startStub.calledOnce).to.be.true;
                expect(spinner.succeed.calledOnce).to.be.true;
                expect(ui.spinner, 'spinner is set to null').to.be.null;
            });
        });

        it('starts spinner with options, resolves function', function () {
            const ui = new UI({stdout: {stdout: true}});
            const testFunc = sinon.stub().resolves('foo');

            return ui.run(testFunc, null, {text: 'do a thing', spinner: 'dots'}).then((result) => {
                expect(result).to.equal('foo');
                expect(testFunc.calledOnce).to.be.true;
                expect(oraStub.calledOnce).to.be.true;
                expect(oraStub.calledWithExactly({
                    text: 'do a thing',
                    spinner: 'dots',
                    stream: {stdout: true}
                })).to.be.true;
                expect(startStub.calledOnce).to.be.true;
                expect(spinner.succeed.calledOnce).to.be.true;
                expect(ui.spinner, 'spinner is set to null').to.be.null;
            });
        });

        it('starts spinner with options, handles clear option', function () {
            const ui = new UI({stdout: {stdout: true}});
            const testFunc = sinon.stub().resolves('foo');

            return ui.run(testFunc, null, {text: 'do a thing', spinner: 'dots', clear: true}).then((result) => {
                expect(result).to.equal('foo');
                expect(testFunc.calledOnce).to.be.true;
                expect(oraStub.calledOnce).to.be.true;
                expect(oraStub.calledWithExactly({
                    text: 'do a thing',
                    spinner: 'dots',
                    stream: {stdout: true}
                })).to.be.true;
                expect(startStub.calledOnce).to.be.true;
                expect(spinner.stop.calledOnce).to.be.true;
                expect(spinner.succeed.called).to.be.false;
                expect(ui.spinner, 'spinner is set to null').to.be.null;
            });
        });

        it('starts spinner with options, handles rejection', function (done) {
            const ui = new UI({stdout: {stdout: true}});
            const testFunc = sinon.stub().rejects(new Error('something went wrong!'));

            ui.run(testFunc, 'test').then(() => {
                done(new Error('then should not be called'));
            }).catch((error) => {
                expect(error, 'run catch error').to.be.an.instanceOf(Error);
                expect(error.message, 'run catch error message').to.equal('something went wrong!');
                expect(testFunc.calledOnce).to.be.true;
                expect(oraStub.calledOnce).to.be.true;
                expect(oraStub.calledWithExactly({
                    text: 'test',
                    spinner: 'hamburger',
                    stream: {stdout: true}
                })).to.be.true;
                expect(startStub.calledOnce).to.be.true;
                expect(spinner.succeed.called).to.be.false;
                expect(spinner.fail.calledOnce).to.be.true;
                expect(ui.spinner, 'spinner is set to null').to.be.null;
                done();
            }).catch(done);
        });
    });

    it('table creates a pretty looking table', function () {
        const UI = require(modulePath);
        const ui = new UI();
        const logStub = sinon.stub(ui, 'log');
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

        ui.table(['a','b','c'], [['d','e','f'], ['g','h','i'], ['j','k','l']]);

        expect(logStub.calledOnce).to.be.true;

        // Clear out all of the escape characters and split by line
        const actualTable = stripAnsi(logStub.firstCall.args[0]).split(/\n/);
        expect(actualTable).to.deep.equal(expectTable);
    });

    describe('prompt', function () {
        const UI = require(modulePath);

        it('fails when prompting is disabled', function (done) {
            const ui = new UI();
            ui.allowPrompt = false;
            const noSpinStub = sinon.stub(ui, 'noSpin');

            try {
                ui.prompt({
                    name: 'test',
                    type: 'input',
                    message: 'Enter anything'
                });
                done(new Error('error should have been thrown'));
            } catch (error) {
                expect(error.message).to.match(/Prompts have been disabled/);
                expect(noSpinStub.called).to.be.false;
                done();
            }
        });

        it('returns default if auto is true and prompts is an object', function () {
            const ui = new UI();
            ui.auto = true;

            const noSpinStub = sinon.stub(ui, 'noSpin');
            const prompt = {
                name: 'test',
                type: 'input',
                message: 'test',
                default: 'testing'
            };

            return ui.prompt(prompt).then((results) => {
                expect(results.test).to.equal('testing');
                expect(noSpinStub.called).to.be.false;
            });
        });

        it('returns defaults and prompts when auto is true and prompts is an array', function () {
            const ui = new UI();
            ui.auto = true;

            const defaultPrompts = [{
                name: 'a',
                default: '1'
            }, {
                name: 'b',
                default: '2'
            }];
            const noDefaultPrompts = [{
                name: 'c'
            }, {
                name: 'd'
            }];

            const noSpinStub = sinon.stub(ui, 'noSpin').callsFake(fn => fn());
            const inquirerStub = sinon.stub(ui, 'inquirer').resolves({c: '3', d: '4'});

            return ui.prompt([...defaultPrompts, ...noDefaultPrompts]).then((answers) => {
                expect(answers).to.deep.equal({
                    a: '1',
                    b: '2',
                    c: '3',
                    d: '4'
                });
                expect(noSpinStub.calledOnce).to.be.true;
                expect(inquirerStub.calledOnce).to.be.true;
                expect(inquirerStub.calledWithExactly(noDefaultPrompts)).to.be.true;
            });
        });

        it('returns default if auto is true and prompt type is list/expand', function () {
            const ui = new UI();
            ui.auto = true;

            const prompts = [{
                type: 'rawlist',
                name: 'a',
                choices: ['small', 'medium', 'large'],
                default: 2
            }, {
                type: 'rawlist',
                name: 'b',
                choices: ['small', 'medium', 'large'],
                default: 0
            }, {
                type: 'expand',
                name: 'c',
                choices: ['small', 'medium', 'large'],
                default: 1
            }];

            const noSpinStub = sinon.stub(ui, 'noSpin');
            return ui.prompt(prompts).then((results) => {
                expect(results).to.deep.equal({
                    a: 'large',
                    b: 'small',
                    c: 'medium'
                });
                expect(noSpinStub.called).to.be.false;
            });
        });

        it('passes options to prompt method', function () {
            const ui = new UI();
            ui.allowPrompt = true;
            const noSpinStub = sinon.stub(ui, 'noSpin').callsFake(fn => fn());
            const inquirerStub = sinon.stub(ui, 'inquirer').resolves();

            const prompt = {
                name: 'test',
                type: 'input',
                message: 'Enter anything'
            };

            return ui.prompt(prompt).then(() => {
                expect(noSpinStub.calledOnce).to.be.true;
                expect(inquirerStub.calledOnce).to.be.true;
                expect(inquirerStub.calledWithExactly(prompt)).to.be.true;
            });
        });
    });

    describe('confirm', function () {
        const UI = require(modulePath);

        it('returns default answer if allowPrompt is false', function () {
            const ui = new UI();
            const promptStub = sinon.stub(ui, 'prompt').resolves({yes: true});
            ui.allowPrompt = false;

            return ui.confirm('Some question', false).then((result) => {
                expect(result).to.be.false;
                expect(promptStub.called).to.be.false;
            });
        });

        it('returns default answers if auto is false', function () {
            const ui = new UI();
            const promptStub = sinon.stub(ui, 'prompt').resolves({yes: true});
            ui.auto = true;

            return ui.confirm('Some question', false).then((result) => {
                expect(result).to.be.false;
                expect(promptStub.called).to.be.false;
            });
        });

        it('calls prompt and returns result if allowPrompt is true', function () {
            const ui = new UI();
            const promptStub = sinon.stub(ui, 'prompt');
            promptStub.onFirstCall().resolves({yes: true});
            promptStub.onSecondCall().resolves({yes: false});
            ui.allowPrompt = true;

            const testA = {
                type: 'confirm',
                name: 'yes',
                message: 'Is the sky blue',
                default: true,
                prefix: undefined
            };
            const testB = {
                type: 'confirm',
                name: 'yes',
                message: 'Is ghost just a blogging platform',
                default: undefined,
                prefix: undefined
            };

            return ui.confirm('Is the sky blue', true).then((result) => {
                expect(result).to.be.true;
                expect(promptStub.calledOnce).to.be.true;
                expect(promptStub.calledWithExactly(testA)).to.be.true;

                return ui.confirm('Is ghost just a blogging platform');
            }).then((result) => {
                expect(result).to.be.false;
                expect(promptStub.calledTwice).to.be.true;
                expect(promptStub.calledWithExactly(testB)).to.be.true;
            });
        });
    });

    describe('listr', function () {
        it('passes tasks to constructor', function () {
            const runStub = sinon.stub().resolves();
            const ListrStub = sinon.stub().returns({run: runStub});
            const createRendererStub = sinon.stub().returns({RendererClass: true});
            const UI = proxyquire(modulePath, {
                listr: ListrStub,
                './renderer': createRendererStub
            });
            const ui = new UI();
            const tasks = ['test','ing','is','necessary'];

            return ui.listr(tasks).then(() => {
                expect(ListrStub.calledWithNew()).to.be.true;
                expect(createRendererStub.calledOnce).to.be.true;
                expect(ListrStub.calledWithExactly(tasks, {
                    renderer: {RendererClass: true},
                    exitOnError: true
                })).to.be.true;
                expect(runStub.calledOnce).to.be.true;
                expect(runStub.calledWithExactly({
                    ui: ui,
                    listr: {run: runStub}
                })).to.be.true;
            });
        });

        it('sets verbose renderer', function () {
            const runStub = sinon.stub().resolves();
            const ListrStub = sinon.stub().returns({run: runStub});
            const createRendererStub = sinon.stub().returns({RendererClass: true});
            const UI = proxyquire(modulePath, {
                listr: ListrStub,
                './renderer': createRendererStub
            });
            const ui = new UI({verbose: true});
            const tasks = ['test','ing','is','necessary'];

            return ui.listr(tasks, {something: 'foo'}, {exitOnError: false}).then(() => {
                expect(ListrStub.calledWithNew()).to.be.true;
                expect(createRendererStub.called).to.be.false;
                expect(ListrStub.calledWithExactly(tasks, {
                    renderer: 'verbose',
                    exitOnError: false
                })).to.be.true;
                expect(runStub.calledOnce).to.be.true;
                expect(runStub.calledWithExactly({
                    something: 'foo',
                    ui: ui,
                    listr: {run: runStub}
                })).to.be.true;
            });
        });

        it('returns listr instance if context is false', function () {
            const runStub = sinon.stub().resolves();
            const ListrStub = sinon.stub().returns({run: runStub});
            const UI = proxyquire(modulePath, {listr: ListrStub});
            const ui = new UI();
            const tasks = ['test','ing','is','necessary'];

            const result = ui.listr(tasks, false, {renderer: 'update'});
            expect(result).to.deep.equal({run: runStub});
            expect(ListrStub.calledWithNew()).to.be.true;
            expect(ListrStub.calledWithExactly(tasks, {
                renderer: 'update',
                exitOnError: true
            })).to.be.true;
            expect(runStub.called).to.be.false;
        });
    });

    describe('sudo', function () {
        const UI = require(modulePath);

        it('runs a sudo command', function (done) {
            const shellStub = sinon.stub(execa, 'shell');
            const ui = new UI();

            const logStub = sinon.stub(ui, 'log');
            const promptStub = sinon.stub(ui, 'prompt').resolves({password: 'password'});
            const stderr = new EventEmitter();

            const eCall = new RegExp(`sudo -S -p '#node-sudo-passwd#' -E -u ghost ${process.argv.slice(0, 2).join(' ')} -v`);

            const stdin = streamTestUtils.getWritableStream((output) => {
                expect(output).to.equal('password\n');
                expect(logStub.calledOnce).to.be.true;
                expect(logStub.calledWithExactly('+ sudo ghost -v', 'gray')).to.be.true;
                expect(shellStub.calledOnce).to.be.true;
                expect(shellStub.args[0][0]).to.match(eCall);
                expect(shellStub.args[0][1]).to.deep.equal({cwd: '/var/foo'});
                expect(promptStub.calledOnce).to.be.true;
                done();
            });
            shellStub.returns({stdin: stdin, stderr: stderr});

            ui.sudo('ghost -v', {cwd: '/var/foo', sudoArgs: ['-E -u ghost']});
            stderr.emit('data', '#node-sudo-passwd#');
        });

        it('can handle defaults', function () {
            const shell = Promise.resolve();
            shell.stderr = {on: () => true};

            const shellStub = sinon.stub(execa, 'shell').returns(shell);
            const ui = new UI();

            sinon.stub(ui, 'log').returns(true);
            sinon.stub(ui, 'prompt');

            return ui.sudo('echo').then(() => {
                expect(shellStub.calledOnce).to.be.true;
                expect(shellStub.args[0][0]).to.match(/#'[ ]{2}echo/);
            });
        });
    });

    describe('noSpin', function () {
        const UI = require(modulePath);

        it('stops and later starts an existing spinner', function () {
            const ui = new UI();
            const spinner = {
                stop: sinon.stub(),
                start: sinon.stub(),
                paused: false
            };
            ui.spinner = spinner;

            const callback = sinon.stub().returns('Pancakes');

            return ui.noSpin(callback).then(function (ret) {
                expect(ret).to.equal('Pancakes');
                expect(callback.calledOnce).to.be.true;
                expect(spinner.stop.calledOnce).to.be.true;
                expect(spinner.start.calledOnce).to.be.true;
            });
        });

        it('passes a value through', function () {
            const ui = new UI();

            return ui.noSpin('Waffles').then(function (ret) {
                expect(ret).to.equal('Waffles');
            });
        });
    });

    describe('log', function () {
        const UI = require(modulePath);

        it('outputs message without color when no color is supplied', function (done) {
            const stdout = streamTestUtils.getWritableStream(function (output) {
                expect(output, 'output exists').to.be.ok;
                expect(hasAnsi(output), 'output has color').to.be.false;
                expect(output, 'output value').to.equal('test\n');

                done();
            });
            stdout.on('error', done);

            const UI = require(modulePath);
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

        it('outputs message to proper stream', function () {
            const stdout = {write: sinon.stub()};
            const stderr = {write: sinon.stub()};

            const ui = new UI({stdout: stdout, stderr: stderr});

            ui.log('Error', null, true);
            ui.log('Good', null, false);

            expect(stdout.write.calledOnce).to.be.true;
            expect(stderr.write.calledOnce).to.be.true;
            expect(stderr.write.firstCall.args[0]).to.equal('Error\n');
            expect(stdout.write.firstCall.args[0]).to.equal('Good\n');
        });

        it('resets spinner', function () {
            const stdout = {write: sinon.stub()};
            const ui = new UI({stdout: stdout});
            const spinner = {
                stop: sinon.stub(),
                paused: false,
                start: sinon.stub()
            };
            ui.spinner = spinner;

            ui.log('test');

            ui.spinner = null;
            ui.log('best');

            expect(spinner.stop.calledOnce).to.be.true;
            expect(spinner.start.calledOnce).to.be.true;
            expect(stdout.write.calledTwice).to.be.true;
            expect(stdout.write.args[0][0]).to.equal('test\n');
            expect(stdout.write.args[1][0]).to.equal('best\n');
        });

        it('displays a multi-line help message when called with 4 args', function (done) {
            const stdout = streamTestUtils.getWritableStream(function (output) {
                expect(output, 'output exists').to.be.ok;
                expect(hasAnsi(output), 'output has color').to.be.true;
                expect(output, 'output value').to.include(chalk.green(`\nmy message: \n\n    ${chalk.cyan('testing')}`));

                done();
            });
            stdout.on('error', done);

            const UI = require(modulePath);
            const ui = new UI({stdout: stdout});
            ui.log('my message', 'testing', 'green', 'link');
        });

        it('displays a multi-line help message with exta line when called with 5 args', function (done) {
            const stdout = streamTestUtils.getWritableStream(function (output) {
                expect(output, 'output exists').to.be.ok;
                expect(hasAnsi(output), 'output has color').to.be.true;
                expect(output, 'output value').to.include(chalk.white(`\nmy message: \n\n    ${chalk.yellow('testing')}\n`));

                done();
            });
            stdout.on('error', done);

            const UI = require(modulePath);
            const ui = new UI({stdout: stdout});
            ui.log('my message', 'testing', 'white', 'cmd', true);
        });
    });

    describe('logVerbose', function () {
        const UI = require(modulePath);

        it('passes through options to log method when verbose is set', function () {
            const ui = new UI({verbose: true});
            const logStub = sinon.stub(ui, 'log');

            ui.logVerbose('foo', 'green', true);
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.firstCall.args).to.deep.equal(['foo', 'green', true]);
        });

        it('does not call log when verbose is false', function () {
            const ui = new UI({verbose: false});
            const logStub = sinon.stub(ui, 'log');

            ui.logVerbose('foo', 'green', false);
            expect(logStub.called).to.be.false;
        });
    });

    it('success outputs message with correct symbols', function (done) {
        const stdout = streamTestUtils.getWritableStream(function (output) {
            expect(output, 'output exists').to.be.ok;
            expect(output, 'output value').to.equal(`${logSymbols.success} test\n`);

            done();
        });
        stdout.on('error', done);

        const UI = require(modulePath);
        const ui = new UI({stdout: stdout});
        ui.success('test');
    });

    it('fail outputs message with correct formatting', function (done) {
        const stdout = streamTestUtils.getWritableStream(function (output) {
            expect(output, 'output exists').to.be.ok;
            expect(output, 'output value').to.equal(`${logSymbols.error} test\n`);

            done();
        });
        stdout.on('error', done);

        const UI = require(modulePath);
        const ui = new UI({stdout: stdout});
        ui.fail('test');
    });

    describe('error', function () {
        const UI = require(modulePath);
        const errors = require('../../../lib/errors');

        describe('handles cliError', function () {
            it('logMessageOnly', function () {
                const ui = new UI({verbose: true});
                const log = sinon.stub(ui, 'log');
                const fail = sinon.stub(ui, 'fail');
                const formatDebug = sinon.stub(ui, '_formatDebug').returns('cherries');

                ui.error(new errors.CliError({message: 'error occurred', logMessageOnly: true}));

                expect(formatDebug.calledOnce).to.be.true;
                expect(log.called).to.be.false;
                expect(fail.calledOnce).to.be.true;
                expect(fail.calledWithExactly('error occurred')).to.be.true;
            });

            it('verbose', function () {
                const ui = new UI({verbose: true});
                const system = {writeErrorLog: sinon.stub()};
                const log = sinon.stub(ui, 'log');
                const formatDebug = sinon.stub(ui, '_formatDebug').returns('cherries');

                const errs = [new errors.ConfigError('bananas'), new errors.CliError({message: 'Bad Stack',logToFile: true})];

                errs.forEach((err) => {
                    ui.error(err, system);
                });

                expect(log.called).to.be.true;
                expect(formatDebug.calledTwice).to.be.true;
                expect(system.writeErrorLog.calledOnce).to.be.true;
                expect(log.args[0][0]).to.match(/Config/);
                expect(log.args[1][0]).to.equal(errs[0].toString(true));
                expect(log.args[2][0]).to.equal('cherries');
                expect(stripAnsi(log.args[3][0])).to.match(/\nTry running ghost doctor to check your system for known issues./);
                expect(log.args[4][0]).to.match(/https:\/\/ghost\.org\/docs\//);
                expect(log.args[5][0]).to.match(/Cli/);
                expect(log.args[6][0]).to.equal(errs[1].toString(true));
                expect(log.args[7][0]).to.equal('cherries');
                expect(log.args[8][0]).to.match(/Additional log info/);
            });

            it('non-verbose', function () {
                const ui = new UI({verbose: false});
                const system = {writeErrorLog: sinon.stub()};
                const log = sinon.stub(ui, 'log');
                const formatDebug = sinon.stub(ui, '_formatDebug').returns('cherries');

                const errs = [new errors.ConfigError('bananas'), new errors.CliError({message: 'Bad Stack',logToFile: true})];

                errs.forEach((err) => {
                    ui.error(err, system);
                });

                expect(log.callCount).to.equal(11);
                expect(formatDebug.calledTwice).to.be.true;
                expect(system.writeErrorLog.calledOnce).to.be.true;
                expect(log.args[0][0]).to.match(/Config/);
                expect(log.args[1][0]).to.equal(errs[0].toString(false));
                expect(log.args[2][0]).to.equal('cherries');
                expect(stripAnsi(log.args[3][0])).to.match(/\nTry running ghost doctor to check your system for known issues./);
                expect(log.args[4][0]).to.match(/https:\/\/ghost\.org\/docs\//);
                expect(log.args[5][0]).to.match(/Cli/);
                expect(log.args[6][0]).to.equal(errs[1].toString(false));
                expect(log.args[7][0]).to.equal('cherries');
                expect(log.args[8][0]).to.match(/Additional log info/);
            });
        });

        describe('handles ListrErrors', function () {
            const ListrError = require('listr/lib/listr-error');

            it('verbose without log output', function () {
                const err = new ListrError('Something happened');
                err.errors = [
                    new errors.SystemError('Error 1'),
                    new errors.SystemError({
                        message: 'Error 2',
                        task: 'Task 2'
                    })
                ];

                const ui = new UI({verbose: true});
                const log = sinon.stub(ui, 'log');
                const formatDebug = sinon.stub(ui, '_formatDebug').returns('cherries');

                const system = {writeErrorLog: sinon.stub()};

                ui.error(err, system);

                expect(log.callCount).to.equal(8);
                expect(formatDebug.calledOnce).to.be.true;
                expect(system.writeErrorLog.called).to.be.false;
                expect(log.args[0][0]).to.match(/One or more errors occurred/);
                expect(log.args[1][0]).to.match(/1\) SystemError/);
                expect(stripAnsi(log.args[2][0])).to.match(/Message: Error 1/);
                expect(log.args[3][0]).to.match(/2\) Task 2/);
                expect(stripAnsi(log.args[4][0])).to.match(/Message: Error 2/);
                expect(log.args[5][0]).to.equal('cherries');
                expect(stripAnsi(log.args[6][0])).to.match(/Try running ghost doctor to check your system for known issues./);
                expect(log.args[7][0]).to.match(/You can always refer to https:\/\/ghost.org\/docs\//);
            });

            it('non-verbose with log output', function () {
                const err = new ListrError('Something happened');
                err.errors = [
                    new errors.ProcessError({message: 'Error 1'}),
                    new errors.ProcessError({
                        message: 'Error 2',
                        task: 'Task 2'
                    })
                ];

                const ui = new UI({verbose: false});
                const log = sinon.stub(ui, 'log');
                const formatDebug = sinon.stub(ui, '_formatDebug').returns('cherries');
                const system = {writeErrorLog: sinon.stub()};

                ui.error(err, system);

                expect(log.callCount).to.equal(9);
                expect(formatDebug.calledOnce).to.be.true;
                expect(system.writeErrorLog.called).to.be.true;
                expect(log.args[0][0]).to.match(/One or more errors occurred/);
                expect(log.args[1][0]).to.match(/1\) ProcessError/);
                expect(stripAnsi(log.args[2][0])).to.match(/Message: Error 1/);
                expect(log.args[3][0]).to.match(/2\) Task 2/);
                expect(stripAnsi(log.args[4][0])).to.match(/Message: Error 2/);
                expect(log.args[5][0]).to.equal('cherries');
                expect(log.args[6][0]).to.match(/Additional log info available in/);
                expect(stripAnsi(log.args[7][0])).to.match(/Try running ghost doctor to check your system for known issues./);
                expect(log.args[8][0]).to.match(/You can always refer to https:\/\/ghost.org\/docs\//);
            });
        });

        describe('handles generic errors', function () {
            it('verbosly', function () {
                const ui = new UI({verbose: true});
                const log = sinon.stub(ui, 'log');
                const formatDebug = sinon.stub(ui, '_formatDebug');
                const system = {writeErrorLog: sinon.stub()};
                const errs = [new Error('Error 1'), new Error('Error 2'), new Error('Error 3'), new Error('Error 4')];
                errs[0].code = 404;
                errs[1].path = '/var/www/ghost/index.js';
                errs[2].stack = null;

                errs.forEach(function (err) {
                    ui.error(err, system);
                });

                const expectedErrors = [
                    `An error occurred.\nMessage: '${errs[0].message}'\n\nStack: ${errs[0].stack}\nCode: ${errs[0].code}\n`.split('\n'),
                    `An error occurred.\nMessage: '${errs[1].message}'\n\nStack: ${errs[1].stack}\nPath: ${errs[1].path}\n`.split('\n'),
                    `An error occurred.\nMessage: '${errs[2].message}'\n\n`.split('\n'),
                    `An error occurred.\nMessage: '${errs[3].message}'\n\nStack: ${errs[3].stack}\n`.split('\n')
                ];
                expect(log.callCount).to.equal(20);
                expect(formatDebug.callCount).to.equal(4);
                expect(system.writeErrorLog.callCount).to.equal(4);
                expectedErrors.forEach(function (err, i) {
                    expect(log.args[i * 5 + 2][0]).to.match(/Additional log info/);
                    expect(stripAnsi(log.args[i * 5 + 3][0])).to.match(/Try running ghost doctor to check your system for known issues./);
                    expect(log.args[i * 5 + 4][0]).to.match(/You can always refer to https:\/\/ghost\.org\/docs\//);
                    expect(stripAnsi(log.args[i * 5][0]).split(/\n/)).to.deep.equal(err);
                });
            });

            it('non-verbose', function () {
                const ui = new UI({verbose: false});
                const log = sinon.stub(ui, 'log');
                const formatDebug = sinon.stub(ui, '_formatDebug');
                const system = {writeErrorLog: sinon.stub()};
                const err = new Error('!!!error!!!');
                const expectedError = `An error occurred.\nMessage: '${err.message}'\n\n`.split('\n');

                ui.error(err, system);

                expect(log.callCount).to.equal(5);
                expect(formatDebug.calledOnce).to.be.true;
                expect(system.writeErrorLog.calledOnce).to.be.true;
                expect(log.args[2][0]).to.match(/Additional log info/);
                expect(stripAnsi(log.args[3][0])).to.match(/Try running ghost doctor to check your system for known issues./);
                expect(log.args[4][0]).to.match(/You can always refer to https:\/\/ghost\.org\/docs\//);
                expect(stripAnsi(log.args[0][0]).split(/\n/)).to.deep.equal(expectedError);
            });
        });

        it('handles objects', function () {
            const ui = new UI();
            const log = sinon.stub(ui, 'log');
            const formatDebug = sinon.stub(ui, '_formatDebug');
            const testError = {
                him: 'her',
                this: 'that',
                here: 'there',
                enough: 'probably'
            };
            const expectedCall = JSON.stringify(testError);

            ui.error(testError);

            expect(formatDebug.calledOnce).to.be.true;
            expect(log.calledTwice).to.be.true;
            expect(log.args[0][0]).to.deep.equal(expectedCall);
            expect(log.args[0][2]).to.be.true;
        });

        it('handles strings', function () {
            const ui = new UI();
            const log = sinon.stub(ui, 'log');
            const formatDebug = sinon.stub(ui, '_formatDebug');
            ui.error('That\'s a known issue');

            expect(formatDebug.calledOnce).to.be.true;
            expect(log.calledTwice).to.be.true;
            expect(log.args[0][0]).to.match(/error occured/);
            expect(stripAnsi(log.args[1][0])).to.match(/Try running ghost doctor to check your system for known issues./);
            expect(log.args[0][2]).to.be.true;
        });

        it('works with false', function () {
            const ui = new UI();
            const log = sinon.stub(ui, 'log');
            const formatDebug = sinon.stub(ui, '_formatDebug');
            ui.error(false);
            expect(log.called).to.be.false;
            expect(formatDebug.calledOnce).to.be.true;
        });
    });

    it('_formatDebug returns a properly formatted value', function () {
        const system = {
            cliVersion: '0.9.1.8',
            environment: 'Earth',
            operatingSystem: {
                distro: 'Ubuntu',
                release: '16'
            },
            getInstance: () => ({version: null})
        };
        const SPACES = '    ';
        const UI = require(modulePath);
        const ui = new UI();
        const expected = ['Debug Information:',
            `${SPACES}OS: Ubuntu, v16`,
            `${SPACES}Node Version: ${process.version}`,
            `${SPACES}Ghost-CLI Version: 0.9.1.8`,
            `${SPACES}Environment: Earth`,
            `${SPACES}Command: 'ghost ${process.argv.slice(2).join(' ')}'`
        ];
        const actual = ui._formatDebug(system).split('\n');

        expect(expected).to.deep.equal(actual);
    });

    it('_formatDebug shows a ghost version if it exists', function () {
        const system = {
            cliVersion: '0.9.1.8',
            environment: 'Earth',
            operatingSystem: {
                distro: 'Ubuntu',
                release: '16'
            },
            getInstance: () => ({version: '1.0.0'})
        };
        const SPACES = '    ';
        const UI = require(modulePath);
        const ui = new UI();
        const expected = ['Debug Information:',
            `${SPACES}OS: Ubuntu, v16`,
            `${SPACES}Node Version: ${process.version}`,
            `${SPACES}Ghost Version: 1.0.0`,
            `${SPACES}Ghost-CLI Version: 0.9.1.8`,
            `${SPACES}Environment: Earth`,
            `${SPACES}Command: 'ghost ${process.argv.slice(2).join(' ')}'`
        ];
        const actual = ui._formatDebug(system).split('\n');

        expect(expected).to.deep.equal(actual);
    });
});
