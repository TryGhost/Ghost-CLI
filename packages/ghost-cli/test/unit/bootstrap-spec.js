'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const {setupTestFolder, cleanupTestFolders} = require('../utils/test-folder');
const path = require('path');
const proxyquire = require('proxyquire');

const yargs = require('yargs');

const modulePath = '../../lib/bootstrap';

describe('Unit: Bootstrap', function () {
    afterEach(function () {
        sinon.restore();
    });

    after(() => {
        cleanupTestFolders();
    });

    describe('discoverCommands', function () {
        const bootstrap = require(modulePath);

        it('loads basic command names into commands object', function () {
            let commands = {};
            const testEnv = setupTestFolder({
                dirs: ['commands/test3'],
                files: [{
                    path: 'commands/test.js',
                    content: ''
                }, {
                    path: 'commands/test2.js',
                    content: ''
                }, {
                    path: 'commands/test3/index.js',
                    content: ''
                }]
            });
            const dir = testEnv.dir;

            commands = bootstrap.discoverCommands(commands, dir, 'testing');

            expect(commands).to.deep.equal({
                test: path.join(dir, 'commands/test'),
                test2: path.join(dir, 'commands/test2'),
                test3: path.join(dir, 'commands/test3')
            });

            testEnv.cleanup();
        });

        it('returns unmodified commands object if no commands dir exists for an extension', function () {
            let commands = {};
            const testEnv = setupTestFolder({});

            commands = bootstrap.discoverCommands(commands, testEnv.dir, 'testing');

            expect(commands).to.deep.equal({});
            testEnv.cleanup();
        });

        it('ignores non-js files or folders without an index.js', function () {
            const testEnv = setupTestFolder({
                dirs: ['commands/test2', 'commands/test3'],
                files: [{
                    path: 'commands/test.js',
                    content: ''
                }, {
                    path: 'commands/test2/index.js',
                    content: ''
                }, {
                    path: 'commands/test3/not-an-index.js',
                    content: ''
                }, {
                    path: 'commands/test4.json',
                    content: {},
                    json: true
                }]
            });

            const dir = testEnv.dir;
            const commands = bootstrap.discoverCommands({}, dir, 'testing');

            expect(commands).to.deep.equal({
                test: path.join(dir, 'commands/test'),
                test2: path.join(dir, 'commands/test2')
            });
            testEnv.cleanup();
        });

        it('namespaces a command with the extension name if another command exists with the same basename', function () {
            const testEnv = setupTestFolder({
                dirs: ['commands/test2'],
                files: [{
                    path: 'commands/test.js',
                    content: ''
                }, {
                    path: 'commands/test2/index.js',
                    content: ''
                }]
            });

            const dir = testEnv.dir;
            const commands = bootstrap.discoverCommands({
                test: '/some/test/dir/test'
            }, dir, 'foo');

            expect(commands).to.deep.equal({
                test: '/some/test/dir/test',
                'foo:test': path.join(dir, 'commands/test'),
                test2: path.join(dir, 'commands/test2')
            });
        });
    });

    describe('process rejection handler', function () {
        require(modulePath);

        let consoleStub;

        beforeEach(function () {
            consoleStub = sinon.stub(console, 'warn');
        });

        it('is registered', function () {
            // mocha itself registers an unhandledRejection listener, so this is 2 instead of 1
            expect(process.listenerCount('unhandledRejection')).to.equal(2);
        });

        it('throws reason and logs to console if it exists', function () {
            const handler = process.listeners('unhandledRejection')[0];
            const testError = new Error('some problem');

            try {
                handler(testError);
                throw new Error('Proper error wasn\'t thrown');
            } catch (e) {
                expect(e, 'thrown error').to.equal(testError);
                expect(consoleStub.args[0][0]).to.match(/^A promise was rejected/);
                expect(consoleStub.args[1][0]).to.equal(testError.stack);
            }
        });

        it('logs reason if reason isn\'t an error', function () {
            const handler = process.listeners('unhandledRejection')[0];

            try {
                handler('some problem');
                throw new Error('Proper error wasn\'t thrown');
            } catch (e) {
                expect(e).to.equal('some problem');
                expect(consoleStub.args[0][0]).to.match(/^A promise was rejected/);
                expect(consoleStub.args[1][0]).to.equal('some problem');
            }
        });

        it('logs promise if no reason given', function () {
            const handler = process.listeners('unhandledRejection')[0];
            const p = new Promise(resolve => resolve());

            try {
                handler(null, p);
                throw new Error('something went wrong');
            } catch (e) {
                expect(e).to.be.null;
                expect(consoleStub.args[0][0]).to.match(/^A promise was rejected/);
                expect(consoleStub.args[1][0]).to.equal(p);
            }
        });
    });

    describe('loadCommand', function () {
        const bootstrap = require(modulePath);

        it('throws an error and returns if the command doesn\'t inherit the base command', function () {
            const errorStub = sinon.stub(console, 'error');
            const commandPath = path.join(__dirname, '../fixtures/classes/test-invalid-command');
            const TestInvalidCommand = require(commandPath);
            const configureStub = sinon.stub();
            TestInvalidCommand.configure = configureStub;

            bootstrap.loadCommand('invalid', commandPath, {}, [], []);
            expect(errorStub.calledOnce).to.be.true;
            expect(errorStub.args[0][0]).to.match(/Command class for invalid does not inherit/);
            expect(configureStub.called).to.be.false;
        });

        it('calls configure on command class with passed properties', function () {
            const errorStub = sinon.stub(console, 'error');
            const commandPath = path.join(__dirname, '../fixtures/classes/test-valid-command');
            const TestValidCommand = require(commandPath);
            const configureStub = sinon.stub(TestValidCommand, 'configure');

            const yargs = {yargs: true};
            const aliases = ['foo', 'bar'];
            const extensions = [{dir: './test-extension', pkg: {name: 'test'}}];

            bootstrap.loadCommand('valid', commandPath, yargs, aliases, extensions);
            expect(errorStub.called).to.be.false;
            expect(configureStub.calledOnce).to.be.true;
            expect(configureStub.calledWithExactly(
                'valid',
                aliases,
                yargs,
                extensions
            )).to.be.true;
        });
    });

    describe('run', function () {
        let discoverCommands;
        let loadCommand;
        let yargsStubs;
        let findExtensionsStub;
        let bootstrap;

        beforeEach(function () {
            findExtensionsStub = sinon.stub().returns([]);
            bootstrap = proxyquire(modulePath, {
                './utils/find-extensions': findExtensionsStub
            });
            discoverCommands = sinon.stub(bootstrap, 'discoverCommands');
            loadCommand = sinon.stub(bootstrap, 'loadCommand');

            yargsStubs = {};

            Object.keys(yargs).forEach((key) => {
                if (typeof yargs[key] === 'function') {
                    yargsStubs[key] = sinon.stub(yargs, key).returns(yargs);
                }
            });
        });

        it('errors if no command name matches', function () {
            this.timeout(10000); // this test can take awhile depending on the system

            const error = sinon.stub(console, 'error');
            const exit = sinon.stub(process, 'exit');

            discoverCommands.returns({
                ls: path.resolve(__dirname, '../../lib/commands/ls')
            });
            exit.throws();

            try {
                bootstrap.run(['notls']);
                throw new Error('Exit wasn\'t called');
            } catch (e) {
                expect(e.message).to.not.equal('Exit wasn\'t called');
                expect(error.args[0][0]).to.match(/^Unrecognized command/);
                expect(exit.args[0][0]).to.equal(1);
            }
        });

        it('loads all commands if the first arg is help', function () {
            const error = sinon.stub(console, 'error');
            discoverCommands.returns({
                ls: path.resolve(__dirname, '../../lib/commands/ls'),
                log: path.resolve(__dirname, '../../lib/commands/log'),
                buster: path.resolve(__dirname, '../../lib/commands/buster')
            });
            findExtensionsStub.returns([{
                dir: './extensions',
                pkg: {
                    name: 'testing'
                }
            }]);

            const argv = ['help'];
            bootstrap.run(argv, yargs);

            expect(error.called).to.be.false;
            expect(discoverCommands.calledTwice).to.be.true;
            expect(loadCommand.calledThrice).to.be.true;
            expect(argv).to.deep.equal(['help']);
            expect(yargsStubs.parse.calledOnce).to.be.true;
            expect(yargsStubs.parse.calledWithExactly(['help'])).to.be.true;
        });

        it('loads one single command if found', function () {
            const error = sinon.stub(console, 'error');
            discoverCommands.returns({
                ls: path.resolve(__dirname, '../../lib/commands/ls'),
                log: path.resolve(__dirname, '../../lib/commands/log'),
                buster: path.resolve(__dirname, '../../lib/commands/buster')
            });

            const argv = ['ls'];
            bootstrap.run(argv, yargs);

            expect(error.called).to.be.false;
            expect(discoverCommands.calledOnce).to.be.true;
            expect(loadCommand.calledOnce).to.be.true;
            expect(argv).to.deep.equal(['ls']);
            expect(yargsStubs.parse.calledOnce).to.be.true;
            expect(yargsStubs.parse.calledWithExactly(['ls'])).to.be.true;
        });
    });
});
