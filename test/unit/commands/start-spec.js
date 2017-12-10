'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const modulePath = '../../../lib/commands/start';
const StartCommand = require(modulePath);

describe('Unit: Commands > Start', function () {
    describe('run', function () {
        let myInstance, mySystem;

        beforeEach(function () {
            myInstance = {
                checkEnvironment: () => true,
                running: () => false
            };

            mySystem = {
                getInstance: () => myInstance,
                environment: 'production'
            };
        });

        it('doesn\'t start a running instance', function () {
            const runningStub = sinon.stub().returns(true)
            myInstance.running = runningStub;
            const start = new StartCommand({}, mySystem);

            return start.run({}).then(() => {
                expect(false, 'Promise should have rejected').to.be.true;
            }).catch((error) => {
                expect(error).to.be.ok;
                expect(error.message).to.match(/^Ghost is already running/);
                expect(runningStub.calledOnce).to.be.true;
            });
        });

        it('runs startup checks', function () {
            const listr = sinon.stub().rejects(new Error('listr'));
            const SetupCommand = proxyquire(modulePath, {
                './doctor/checks/startup': () => Promise.resolve('start')
            });
            const setup = new SetupCommand({listr: listr}, mySystem);

            return setup.run({}).then(() => {
                expect(false, 'Promise should have rejected').to.be.true;
            }).catch((error) => {
                expect(error).to.be.ok;
                expect(error.message).to.equal('listr');
                expect(listr.calledOnce).to.be.true;
                // This is what listr was supposed to run - run it and make
                // sure it's our override that was run
                const cmd = listr.getCall(0).args[0];
                return cmd().then((res) => {
                    expect(res).to.equal('start');
                });
            });
        });

        it('runs instance start', function () {
            myInstance.running = sinon.stub();
            myInstance.process = {start: sinon.stub()};
            mySystem.environment = 'Ghost';
            const ui = {
                listr: () => Promise.resolve(),
                run: sinon.stub().rejects(new Error('UI_RUN'))
            };
            const setup = new StartCommand(ui, mySystem);

            return setup.run({}).then(() => {
                expect(false, 'Promise should have rejected').to.be.true;
            }).catch((error) => {
                expect(error).to.be.ok;
                expect(error.message).to.equal('UI_RUN');
                const running = myInstance.running;
                const proces = myInstance.process.start;

                expect(ui.run.calledOnce).to.be.true;
                return ui.run.getCall(0).args[0]().then(() => {
                    expect(running.calledTwice).to.be.true;
                    expect(running.getCall(0).args).to.be.empty;
                    expect(running.getCall(1).args[0]).to.equal('Ghost');

                    expect(proces.calledOnce).to.be.true;
                    expect(proces.getCall(0).args[0]).to.equal(process.cwd());
                    expect(proces.getCall(0).args[1]).to.equal('Ghost');
                });
            });
        });

        describe('enables instance if needed', function () {
            it('normal conditions', function () {
                const ui = {
                    run: sinon.stub().resolves(),
                    listr: () => Promise.resolve()
                };
                myInstance.process = {
                    isEnabled: sinon.stub().returns(false),
                    enable: sinon.stub(),
                    disable: 'yes'
                };
                const start = new StartCommand(ui, mySystem);
                return start.run({quiet: true, enable: true}).then(() => {
                    const ie = myInstance.process.isEnabled;
                    const enable = myInstance.process.enable;
                    expect(ie.calledOnce).to.be.true;
                    expect(enable.calledOnce).to.be.true;
                    expect(ui.run.calledTwice).to.be.true;
                });
            });

            it('not when it\'s not possible (already enabled)', function () {
                const ui = {
                    run: sinon.stub().resolves(),
                    listr: () => Promise.resolve()
                };
                myInstance.process = {
                    isEnabled: sinon.stub().returns(true),
                    enable: sinon.stub(),
                    disable: 'yes'
                };
                const start = new StartCommand(ui, mySystem);
                return start.run({quiet: true, enable: true}).then(() => {
                    const ie = myInstance.process.isEnabled;
                    const enable = myInstance.process.enable;
                    expect(ie.calledOnce).to.be.true;
                    expect(enable.called).to.be.false;
                    expect(ui.run.calledOnce).to.be.true;
                });
            });

            it('not when it\'s not possible (unsupported)', function () {
                const ui = {
                    run: sinon.stub().resolves(),
                    listr: () => Promise.resolve()
                };
                myInstance.process = {
                    isEnabled: sinon.stub().returns(true),
                    enable: sinon.stub()
                };
                const start = new StartCommand(ui, mySystem);
                return start.run({quiet: true, enable: true}).then(() => {
                    const ie = myInstance.process.isEnabled;
                    const enable = myInstance.process.enable;
                    expect(ie.called).to.be.false;
                    expect(enable.called).to.be.false;
                    expect(ui.run.calledOnce).to.be.true;
                });
            });
        });

        it('is normally loud', function () {
            myInstance.config = {get: () => ''};
            myInstance.process = {};
            const ui = {
                run: () => Promise.resolve(),
                listr: () => Promise.resolve(),
                log: sinon.stub()
            };
            const start = new StartCommand(ui, mySystem);
            return start.run({enable: false}).then(() => {
                expect(ui.log.calledOnce).to.be.true;
                expect(ui.log.getCall(0).args[0]).to.match(/You can access your blog/);
            });
        });

        it('warns of direct mail transport', function () {
            myInstance.config = {get: () => 'Direct'};
            myInstance.process = {};
            const ui = {
                run: () => Promise.resolve(),
                listr: () => Promise.resolve(),
                log: sinon.stub()
            };
            const start = new StartCommand(ui, mySystem);
            return start.run({enable: false}).then(() => {
                expect(ui.log.calledThrice).to.be.true;
                expect(ui.log.getCall(1).args[0]).to.match(/Ghost uses direct mail/);
                expect(ui.log.getCall(2).args[0]).to.match(/alternative email method/);
            });
        });
    });

    // @todo: Add more tests if necessary
    it('configureOptions loops over extensions', function () {
        const extensions = [{
            config: {options: {start: {test: true}}}
        }, {}];

        const yargs = {option: sinon.stub(), epilogue: () => true};
        yargs.option.returns(yargs);
        StartCommand.configureOptions.call({options: {}}, 'Test', yargs, extensions, true);
        expect(yargs.option.called).to.be.true;
        expect(yargs.option.getCall(0).args[0]).to.equal('test');
    });
});
