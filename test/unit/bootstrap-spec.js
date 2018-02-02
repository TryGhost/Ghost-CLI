'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const rewire = require('rewire');
const env = require('../utils/env');
const path = require('path');

const bootstrap = rewire('../../lib/bootstrap');

describe('Unit: Bootstrap', function () {
    describe('discoverCommands', function () {
        it('loads basic command names into commands object', function () {
            let commands = {};
            const testEnv = env({
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
            const testEnv = env({});

            commands = bootstrap.discoverCommands(commands, testEnv.dir, 'testing');

            expect(commands).to.deep.equal({});
            testEnv.cleanup();
        });

        it('ignores non-js files or folders without an index.js', function () {
            const testEnv = env({
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
            const testEnv = env({
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
        let sandbox;
        let consoleStub;

        before(function () {
            sandbox = sinon.sandbox.create();
        });

        beforeEach(function () {
            consoleStub = sandbox.stub(console, 'warn');
        });

        afterEach(function () {
            sandbox.restore();
        });

        it('is registered', function () {
            expect(process.listenerCount('unhandledRejection')).to.equal(1);
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
            const p = new Promise((resolve) => resolve());

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

    describe('run', function () {
        let sandbox;
        let discoverCommands;
        let reset;

        before(function () {
            sandbox = sinon.sandbox.create();
        });

        beforeEach(function () {
            discoverCommands = sandbox.stub();
            reset = bootstrap.__set__('discoverCommands', discoverCommands);
        });

        afterEach(function () {
            reset();
            sandbox.restore();
        });

        it('errors and exits with no args', function () {
            const error = sandbox.stub(console, 'error');
            const exit = sandbox.stub(process, 'exit');

            exit.throws();

            try {
                bootstrap.run([]);
            } catch (e) {
                expect(error.args[0][0]).to.match(/^No command specified/);
                expect(exit.args[0][0]).to.equal(1);
            }
        });

        it('errors if no command name matches', function () {
            this.timeout(10000); // this test can take awhile depending on the system

            const error = sandbox.stub(console, 'error');
            const exit = sandbox.stub(process, 'exit');

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

        describe('with first arg as a command name', function () {
            it('errors when discovered command is *not* an instance of the command class', function () {
                this.timeout(5000);
                const testEnv = env({
                    dirs: ['commands'],
                    files: [{
                        path: 'commands/test.js',
                        content: 'module.exports = {};'
                    }]
                });
                const exit = sandbox.stub(process, 'exit');
                const error = sandbox.stub(console, 'error');

                discoverCommands.returns({
                    test: path.join(testEnv.dir, 'commands/test')
                });
                exit.throws();

                try {
                    bootstrap.run(['test']);
                } catch (e) {
                    expect(error.args[0][0]).to.match(/does not inherit from Ghost-CLI/);
                    expect(exit.args[0][0]).to.equal(1);
                }
            });
        });
    });
});
