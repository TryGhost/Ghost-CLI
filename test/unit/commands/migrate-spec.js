'use strict';
const expect = require('chai').expect;
const proxyquire = require('proxyquire');
const sinon = require('sinon');

const modulePath = '../../../lib/commands/migrate';

function build(migrations) {
    const runStub = sinon.stub().callsFake((fn, title) => {
        expect(title).to.equal('Checking for available migrations');
        return Promise.resolve(fn());
    });

    const ui = {
        run: runStub,
        listr: sinon.stub().resolves(),
        log: sinon.stub()
    };

    const config = {
        get: sinon.stub().returns('1.1.0'),
        set: sinon.stub(),
        save: sinon.stub()
    };

    config.set.returns(config);

    const system = {
        cliVersion: '1.2.0',
        hook: sinon.stub().resolves(),
        getInstance: sinon.stub().returns({cliConfig: config})
    };

    const parseStub = sinon.stub().returns(migrations);

    const Cmd = proxyquire(modulePath, {'../utils/needed-migrations': parseStub});

    return {
        cmd: new Cmd(ui, system),
        config: config,
        parse: parseStub
    };
}

describe('Unit: Commands > Migrate', function () {
    it('runs needed migrations', function () {
        const migrations = [{
            title: 'Something',
            task: () => {}
        }];

        const built = build(migrations);

        return built.cmd.run({}).then(() => {
            expect(built.cmd.ui.run.calledOnce).to.be.true;
            expect(built.cmd.system.hook.calledOnce).to.be.true;
            expect(built.parse.calledOnce).to.be.true;
            expect(built.cmd.ui.listr.calledOnce).to.be.true;
            expect(built.cmd.ui.listr.calledWith(migrations)).to.be.true;
            expect(built.config.get.calledOnce).to.be.true;
            expect(built.config.set.calledOnce).to.be.true;
            expect(built.config.set.calledWithExactly('cli-version', '1.2.0')).to.be.true;
        });
    });

    it('skips if no migrations', function () {
        const built = build([]);

        return built.cmd.run({}).then(() => {
            expect(built.cmd.ui.run.calledOnce).to.be.true;
            expect(built.cmd.system.hook.calledOnce).to.be.true;
            expect(built.parse.calledOnce).to.be.true;
            expect(built.cmd.ui.listr.calledOnce).to.be.false;
            expect(built.cmd.ui.log.calledOnce).to.be.true;
            expect(built.config.get.calledOnce).to.be.true;
            expect(built.config.set.calledOnce).to.be.true;
            expect(built.config.set.calledWithExactly('cli-version', '1.2.0')).to.be.true;
        });
    });

    it('quiet supresses output', function () {
        const built = build([]);

        return built.cmd.run({quiet: true}).then(() => {
            expect(built.cmd.ui.run.calledOnce).to.be.true;
            expect(built.cmd.system.hook.calledOnce).to.be.true;
            expect(built.parse.calledOnce).to.be.true;
            expect(built.cmd.ui.listr.calledOnce).to.be.false;
            expect(built.cmd.ui.log.calledOnce).to.be.false;
            expect(built.config.get.calledOnce).to.be.true;
            expect(built.config.set.calledOnce).to.be.true;
            expect(built.config.set.calledWithExactly('cli-version', '1.2.0')).to.be.true;
        });
    });
});
