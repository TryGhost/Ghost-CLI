'use strict';
const {expect} = require('chai');
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');
const stripAnsi = require('strip-ansi');

const modulePath = '../../../lib/utils/update-check';

describe('Unit: Utils > update-check', function () {
    it('rejects error if latestVersion has an error', function (done) {
        const pkg = {name: 'ghost', version: '1.0.0'};
        const testError = new Error('update check');
        const latestVersion = sinon.stub().rejects(testError);
        const ui = {run: sinon.stub().callsFake(fn => fn())};

        const updateCheck = proxyquire(modulePath, {
            '../../package.json': pkg,
            'latest-version': latestVersion
        });

        updateCheck(ui).catch((err) => {
            expect(err.message).to.equal(testError.message);
            expect(ui.run.calledOnce).to.be.true;
            expect(latestVersion.calledOnce).to.be.true;
            expect(latestVersion.calledWithExactly('ghost')).to.be.true;
            done();
        });
    });

    it('doesn\'t do anything if there are no updates', function () {
        const pkg = {name: 'ghost', version: '1.0.0'};
        const latestVersion = sinon.stub().resolves('1.0.0');
        const ui = {
            run: sinon.stub().callsFake(fn => fn()),
            log: sinon.stub()
        };

        const updateCheck = proxyquire(modulePath, {
            '../../package.json': pkg,
            'latest-version': latestVersion
        });

        return updateCheck(ui).then(() => {
            expect(ui.run.calledOnce).to.be.true;
            expect(ui.log.called).to.be.false;
            expect(latestVersion.calledOnce).to.be.true;
            expect(latestVersion.calledWithExactly('ghost')).to.be.true;
        });
    });

    it('logs a message if an update is available', function () {
        const pkg = {name: 'ghost', version: '1.0.0'};
        const latestVersion = sinon.stub().resolves('1.1.0');
        const ui = {
            run: sinon.stub().callsFake(fn => fn()),
            log: sinon.stub()
        };

        const updateCheck = proxyquire(modulePath, {
            '../../package.json': pkg,
            'latest-version': latestVersion
        });

        return updateCheck(ui).then(() => {
            expect(ui.run.calledOnce).to.be.true;
            expect(ui.log.calledOnce).to.be.true;

            const log = ui.log.args[0][0];

            expect(stripAnsi(log)).to.match(/You are running an outdated version of Ghost-CLI/);

            expect(latestVersion.calledOnce).to.be.true;
            expect(latestVersion.calledWithExactly('ghost')).to.be.true;
        });
    });
});
