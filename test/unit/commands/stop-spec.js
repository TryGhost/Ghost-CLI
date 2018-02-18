'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const modulePath = '../../../lib/commands/stop';
const errors = require('../../../lib/errors');
const StopCommand = require(modulePath);

function proxiedCommand() {
    return new(proxyquire(modulePath, {'../utils/check-valid-install': () => true}))();
}

describe('Unit: Commands > Stop', function () {
    describe('run', function () {
        it('stops all if flag is provided', function () {
            const stop = new StopCommand();
            const sAstub = sinon.stub();
            const context = {stopAll: sAstub};
            stop.run.call(context, {all: true});
            expect(sAstub.calledOnce).to.be.true;
        });

        it('errors when unknown instance is specified', function () {
            const stop = new StopCommand();
            const gIstub = sinon.stub().returns(false);
            const context = {system: {getInstance: gIstub}};

            return stop.run.call(context, {name: 'ghost'}).then(() => {
                expect(false, 'Promise should have rejected').to.be.true;
            }).catch((error) => {
                expect(error).to.be.ok;
                expect(error instanceof errors.SystemError).to.be.true;
                expect(error.message).to.match(/does not exist/);
            });
        });

        it('chdirs to instance install directory', function () {
            const originalCommand = process.chdir;
            process.chdir = sinon.stub().throws(new Error('SHORT_CIRCUIT'));
            const stop = new StopCommand();
            const gIstub = sinon.stub().returns({dir: '../ghost'});
            const context = {system: {getInstance: gIstub}};

            try {
                stop.run.call(context, {name: 'ghost'});
                process.chdir = originalCommand;
            } catch (error) {
                const pcss = process.chdir;
                process.chdir = originalCommand;
                expect(error).to.be.ok;
                expect(error.message).to.equal('SHORT_CIRCUIT');
                expect(pcss.calledOnce).to.be.true;
                expect(pcss.args[0][0]).to.equal('../ghost');
            }
        });

        it('doesn\'t stop stopped instances', function () {
            const runningStub = sinon.stub().returns(false);
            const gIstub = sinon.stub().returns({running: runningStub});
            const context = {system: {getInstance: gIstub}};
            const stop = proxiedCommand();

            return stop.run.call(context, {}).then(() => {
                expect(false, 'Promise should have rejected').to.be.true;
            }).catch((error) => {
                expect(error).to.be.ok;
                expect(error instanceof errors.SystemError).to.be.true;
                expect(error.message).to.match(/No running Ghost instance/);
            });
        });

        it('calls process manger stop', function () {
            const stop = proxiedCommand();
            const stopStub = sinon.stub().resolves();
            const runningStub = sinon.stub().returns(true);
            const gIstub = sinon.stub().returns({
                running: runningStub,
                process: {stop: stopStub},
                loadRunningEnvironment: () => true
            });

            const runner = (fn, name) => {
                expect(fn).to.be.ok;
                expect(name).to.equal('Stopping Ghost');
                return fn().then(() => {
                    expect(stopStub.calledOnce).to.be.true;
                    expect(stopStub.args[0][0]).to.equal(process.cwd());
                    expect(runningStub.calledTwice).to.be.true;
                    expect(runningStub.args[1][0]).to.equal(null);
                });
            }

            const context = {
                system: {getInstance: gIstub},
                ui: {run: runner}
            };

            return stop.run.call(context, {});
        });

        it('disables extensions if it needs to', function () {
            class ProcessManager {}
            const sEBstub = sinon.stub().returns(true);
            const disableStub = sinon.stub().resolves();
            const gIstub = sinon.stub().returns({
                running: () => true,
                process: {
                    disable: disableStub,
                    stop: () => true,
                    isEnabled: () => true
                },
                loadRunningEnvironment: () => true
            });
            const context = {
                system: {getInstance: gIstub},
                ui: {run: () => Promise.resolve()}
            };
            ProcessManager.supportsEnableBehavior = sEBstub;
            const StopCommand = proxyquire(modulePath, {
                '../utils/check-valid-install': () => true,
                '../process-manager': ProcessManager
            });
            const stop = new StopCommand();

            return stop.run.call(context, {disable: true}).then(() => {
                expect(sEBstub.calledOnce).to.be.true;
                expect(disableStub.calledOnce).to.be.true;
            });
        });
    });

    it('stopAll stops all instances', function () {
        const stop = new StopCommand();
        const runStub = sinon.stub().callsFake((fn) => fn.call(stop));
        const cases = 'abcdefgh'.split('');
        const instances = [];
        cases.forEach((cse) => {
            instances.push({
                dir: `./${cse}`,
                name: cse
            });
        });

        const context = {
            system: {getAllInstances: () => instances},
            ui: {run: runStub},
            run: sinon.stub().resolves()
        };
        const originalChdir = process.chdir;
        process.chdir = sinon.stub();

        return stop.stopAll.call(context).then(() => {
            const pcss = process.chdir;
            process.chdir = originalChdir;

            expect(runStub.callCount).to.equal(8);
            expect(context.run.callCount).to.equal(8);
            expect(context.run.args[0][0].quiet).to.be.true;
            expect(pcss.callCount).to.equal(9);
            expect(pcss.args[0][0]).to.equal('./a');
            expect(pcss.args[8][0]).to.equal(process.cwd());
        });
    });

    // @todo: Add more tests if necessary
    it('configureOptions loops over extensions', function () {
        const extensions = [{
            config: {options: {stop: {test: true}}}
        }, {}];

        const yargs = {option: sinon.stub(), epilogue: () => true};
        yargs.option.returns(yargs);
        StopCommand.configureOptions.call({options: {}}, 'Test', yargs, extensions, true);
        expect(yargs.option.called).to.be.true;
        expect(yargs.option.args[0][0]).to.equal('test');
    });
});
