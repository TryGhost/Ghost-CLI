'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const {SystemError} = require('../../../lib/errors');

const modulePath = '../../../lib/commands/stop';
const StopCommand = require(modulePath);

describe('Unit: Commands > Stop', function () {
    describe('run', function () {
        it('stops all if flag is provided', async function () {
            const stop = new StopCommand();
            const stopAll = sinon.stub(stop, 'stopAll').resolves();

            await stop.run({all: true});
            expect(stopAll.calledOnce).to.be.true;
        });

        it('checks for valid install if name not specified', async function () {
            const findStub = sinon.stub().throws(new Error('findValidInstall'));
            const Command = proxyquire(modulePath, {
                '../utils/find-valid-install': findStub
            });
            const stop = new Command();

            try {
                await stop.run({});
            } catch (error) {
                expect(error.message).to.equal('findValidInstall');
                expect(findStub.calledOnce).to.be.true;
                return;
            }

            expect.fail('run should have thrown an error');
        });

        it('throws an error if no instance found for given name', async function () {
            const getInstance = sinon.stub().returns(null);
            const stop = new StopCommand({}, {getInstance});

            try {
                await stop.run({name: 'test'});
            } catch (error) {
                expect(error).to.be.an.instanceof(SystemError);
                expect(error.message).to.include('\'test\' does not exist');
                expect(getInstance.calledOnce).to.be.true;
                expect(getInstance.calledWithExactly('test')).to.be.true;
            }
        });

        it('logs and exits if instance isn\'t running', async function () {
            const log = sinon.stub();
            const isRunning = sinon.stub().resolves(false);
            const getInstance = sinon.stub().returns({isRunning});
            const stop = new StopCommand({log}, {getInstance});

            await stop.run({name: 'testing'});

            expect(getInstance.calledOnce).to.be.true;
            expect(getInstance.calledWithExactly('testing')).to.be.true;
            expect(isRunning.calledOnce).to.be.true;
            expect(log.calledOnce).to.be.true;
        });

        it('stops instance', async function () {
            const log = sinon.stub();
            const run = sinon.stub().callsFake(fn => fn());

            const isRunning = sinon.stub().resolves(true);
            const stop = sinon.stub().resolves();

            const getInstance = sinon.stub().returns({isRunning, stop});

            const cmd = new StopCommand({log, run}, {getInstance});
            await cmd.run({name: 'testing'});

            expect(getInstance.calledOnce).to.be.true;
            expect(getInstance.calledWithExactly('testing')).to.be.true;
            expect(isRunning.calledOnce).to.be.true;
            expect(run.calledOnce).to.be.true;
            expect(stop.calledOnce).to.be.true;
            expect(log.called).to.be.false;
        });
    });

    it('stopAll stops all instances', async function () {
        const cases = 'abcdefgh'.split('');
        const instances = cases.map(cse => ({
            dir: `./${cse}`,
            name: cse
        }));

        const run = sinon.stub().callsFake(fn => fn());
        const getAllInstances = sinon.stub().returns(instances);

        const stop = new StopCommand({run}, {getAllInstances});
        const cmdRun = sinon.stub(stop, 'run').resolves();

        await stop.stopAll();
        expect(getAllInstances.calledOnce).to.be.true;
        expect(run.callCount).to.equal(8);
        expect(cmdRun.callCount).to.equal(8);

        expect(cmdRun.calledWithExactly({quiet: true, name: 'a'})).to.be.true;
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
