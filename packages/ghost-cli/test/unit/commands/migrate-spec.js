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

    const instance = {
        cliVersion: '1.1.0'
    };

    const system = {
        cliVersion: '1.2.0',
        hook: sinon.stub().resolves(),
        getInstance: sinon.stub().returns(instance)
    };

    const parseStub = sinon.stub().returns(migrations);

    const Cmd = proxyquire(modulePath, {'../utils/needed-migrations': parseStub});

    return {
        cmd: new Cmd(ui, system),
        instance,
        parse: parseStub
    };
}

describe('Unit: Commands > Migrate', function () {
    it('runs needed migrations', function () {
        const migrations = [{
            title: 'Something',
            task: () => {}
        }];

        const {cmd, instance, parse} = build(migrations);

        return cmd.run({}).then(() => {
            expect(cmd.ui.run.calledOnce).to.be.true;
            expect(cmd.system.hook.calledOnce).to.be.true;
            expect(parse.calledOnce).to.be.true;
            expect(cmd.ui.listr.calledOnce).to.be.true;
            expect(cmd.ui.listr.calledWith(migrations)).to.be.true;
            expect(instance.cliVersion).to.equal('1.2.0');
        });
    });

    it('skips if no migrations', function () {
        const {cmd, instance, parse} = build([]);

        return cmd.run({}).then(() => {
            expect(cmd.ui.run.calledOnce).to.be.true;
            expect(cmd.system.hook.calledOnce).to.be.true;
            expect(parse.calledOnce).to.be.true;
            expect(cmd.ui.listr.calledOnce).to.be.false;
            expect(cmd.ui.log.calledOnce).to.be.true;
            expect(instance.cliVersion).to.equal('1.2.0');
        });
    });

    it('quiet supresses output', function () {
        const {cmd, instance, parse} = build([]);

        return cmd.run({quiet: true}).then(() => {
            expect(cmd.ui.run.calledOnce).to.be.true;
            expect(cmd.system.hook.calledOnce).to.be.true;
            expect(parse.calledOnce).to.be.true;
            expect(cmd.ui.listr.calledOnce).to.be.false;
            expect(cmd.ui.log.calledOnce).to.be.false;
            expect(instance.cliVersion).to.equal('1.2.0');
        });
    });
});
