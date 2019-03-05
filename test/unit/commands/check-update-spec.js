const sinon = require('sinon');
const proxyquire = require('proxyquire');
const {expect} = require('chai');
const {CliError} = require('../../../lib/errors');

const modulePath = '../../../lib/commands/check-update';

describe('Unit: Commands > check-update', function () {
    it('doesn\'t output anything if instance doesn\'t exist', function () {
        const CheckUpdateCommand = require(modulePath);
        const log = sinon.stub();
        const getInstance = sinon.stub().returns({version: null});

        const cmd = new CheckUpdateCommand({log}, {getInstance});

        cmd.run({v1: false});

        expect(getInstance.calledOnce).to.be.true;
        expect(log.called).to.be.false;
    });

    it('doesn\'t output anything if no new versions are available', function () {
        const resolveVersion = sinon.stub().rejects(new CliError('No valid versions found.'));

        const CheckUpdateCommand = proxyquire(modulePath, {
            '../utils/resolve-version': resolveVersion
        });

        const log = sinon.stub();
        const getInstance = sinon.stub().returns({version: '2.0.0'});

        const cmd = new CheckUpdateCommand({log}, {getInstance});

        return cmd.run({v1: false}).then(() => {
            expect(getInstance.calledOnce).to.be.true;
            expect(resolveVersion.calledOnce).to.be.true;
            expect(resolveVersion.calledWithExactly(null, '2.0.0', false)).to.be.true;
            expect(log.called).to.be.false;
        });
    });

    it('rejects errors from resolveVersion', function () {
        const resolveVersion = sinon.stub().rejects(new CliError('An error occurred'));

        const CheckUpdateCommand = proxyquire(modulePath, {
            '../utils/resolve-version': resolveVersion
        });

        const log = sinon.stub();
        const getInstance = sinon.stub().returns({version: '2.0.0'});

        const cmd = new CheckUpdateCommand({log}, {getInstance});

        return cmd.run({v1: true}).then(() => {
            expect(false, 'error should have been thrown').to.be.false;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(CliError);
            expect(getInstance.calledOnce).to.be.true;
            expect(resolveVersion.calledOnce).to.be.true;
            expect(resolveVersion.calledWithExactly(null, '2.0.0', true)).to.be.true;
            expect(log.called).to.be.false;
        });
    });

    it('logs out available new version', function () {
        const resolveVersion = sinon.stub().resolves('2.1.0');

        const CheckUpdateCommand = proxyquire(modulePath, {
            '../utils/resolve-version': resolveVersion
        });

        const log = sinon.stub();
        const getInstance = sinon.stub().returns({version: '2.0.0'});

        const cmd = new CheckUpdateCommand({log}, {getInstance});

        return cmd.run({v1: true}).then(() => {
            expect(getInstance.calledOnce).to.be.true;
            expect(resolveVersion.calledOnce).to.be.true;
            expect(resolveVersion.calledWithExactly(null, '2.0.0', true)).to.be.true;
            expect(log.calledOnce).to.be.true;
        });
    });
});
