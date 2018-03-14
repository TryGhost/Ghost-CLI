'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const modulePath = '../../../lib/commands/start';
const StartCommand = require(modulePath);

describe('Unit: Commands > Start', function () {
    describe('run', function () {
        let myInstance, mySystem;

        beforeEach(function () {
            myInstance = {
                checkEnvironment: () => true,
                running: () => Promise.resolve(false)
            };

            mySystem = {
                getInstance: () => myInstance,
                environment: 'production'
            };
        });

        it('gracefully notifies of already running instance', function () {
            const runningStub = sinon.stub().resolves(true)
            const logStub = sinon.stub();
            const ui = {log: logStub};
            const start = new StartCommand(ui, mySystem);
            myInstance.running = runningStub;

            return start.run({}).then(() => {
                expect(runningStub.calledOnce).to.be.true;
                expect(logStub.calledOnce).to.be.true;
                expect(logStub.args[0][0]).to.match(/Ghost is already running!/);
            });
        });

        it('runs startup checks', function () {
            const listr = sinon.stub().resolves();
            const StartCommand = proxyquire(modulePath, {
                './doctor': {doctorCommand: true}
            });
            const start = new StartCommand({listr: listr}, mySystem);
            const runCommandStub = sinon.stub(start, 'runCommand').rejects(new Error('runCommand'));

            return start.run({argv: true}).then(() => {
                expect(false, 'Promise should have rejected').to.be.true;
            }).catch((error) => {
                expect(error).to.be.ok;
                expect(error.message).to.equal('runCommand');
                expect(runCommandStub.calledOnce).to.be.true;
                expect(runCommandStub.calledWithExactly(
                    {doctorCommand: true},
                    {categories: ['start'], quiet: true, argv: true}
                )).to.be.true;
                expect(listr.called).to.be.false;
            });
        });

        it('runs instance start', function () {
            myInstance.running = sinon.stub().resolves(false);
            myInstance.process = {start: sinon.stub()};
            mySystem.environment = 'Ghost';
            const ui = {
                listr: () => Promise.resolve(),
                run: sinon.stub().rejects(new Error('UI_RUN'))
            };
            const start = new StartCommand(ui, mySystem);
            const runCommandStub = sinon.stub(start, 'runCommand').resolves();

            return start.run({}).then(() => {
                expect(false, 'Promise should have rejected').to.be.true;
            }).catch((error) => {
                expect(error).to.be.ok;
                expect(error.message).to.equal('UI_RUN');
                expect(runCommandStub.calledOnce).to.be.true;
                const running = myInstance.running;
                const proces = myInstance.process.start;

                expect(ui.run.calledOnce).to.be.true;
                return ui.run.args[0][0]().then(() => {
                    expect(running.calledTwice).to.be.true;
                    expect(running.args[0]).to.be.empty;
                    expect(running.args[1][0]).to.equal('Ghost');

                    expect(proces.calledOnce).to.be.true;
                    expect(proces.args[0][0]).to.equal(process.cwd());
                    expect(proces.args[0][1]).to.equal('Ghost');
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
                const runCommandStub = sinon.stub(start, 'runCommand').resolves();
                return start.run({quiet: true, enable: true}).then(() => {
                    const ie = myInstance.process.isEnabled;
                    const enable = myInstance.process.enable;
                    expect(runCommandStub.calledOnce).to.be.true;
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
                const runCommandStub = sinon.stub(start, 'runCommand').resolves();
                return start.run({quiet: true, enable: true}).then(() => {
                    const ie = myInstance.process.isEnabled;
                    const enable = myInstance.process.enable;
                    expect(runCommandStub.calledOnce).to.be.true;
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
                const runCommandStub = sinon.stub(start, 'runCommand').resolves();
                return start.run({quiet: true, enable: true}).then(() => {
                    const ie = myInstance.process.isEnabled;
                    const enable = myInstance.process.enable;
                    expect(ie.called).to.be.false;
                    expect(runCommandStub.calledOnce).to.be.true;
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
            const runCommandStub = sinon.stub(start, 'runCommand').resolves();
            return start.run({enable: false}).then(() => {
                expect(runCommandStub.calledOnce).to.be.true;
                expect(ui.log.calledOnce).to.be.true;
                expect(ui.log.args[0][0]).to.match(/You can access your blog/);
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
            const runCommandStub = sinon.stub(start, 'runCommand').resolves();
            return start.run({enable: false}).then(() => {
                expect(runCommandStub.calledOnce).to.be.true;
                expect(ui.log.calledThrice).to.be.true;
                expect(ui.log.args[1][0]).to.match(/Ghost uses direct mail/);
                expect(ui.log.args[2][0]).to.match(/alternative email method/);
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
        expect(yargs.option.args[0][0]).to.equal('test');
    });
});
