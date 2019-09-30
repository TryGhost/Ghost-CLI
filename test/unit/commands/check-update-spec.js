const sinon = require('sinon');
const proxyquire = require('proxyquire');
const {expect} = require('chai');

const modulePath = '../../../lib/commands/check-update';

describe('Unit: Commands > check-update', function () {
    it('doesn\'t output anything if instance doesn\'t exist', async function () {
        const CheckUpdateCommand = require(modulePath);
        const log = sinon.stub();
        const getInstance = sinon.stub().returns({version: null});

        const cmd = new CheckUpdateCommand({log}, {getInstance});

        await cmd.run({v1: false});

        expect(getInstance.calledOnce).to.be.true;
        expect(log.called).to.be.false;
    });

    it('doesn\'t output anything if no new versions are available', async function () {
        const loadVersions = sinon.stub().resolves({latest: '2.0.0', latestMajor: {v1: '1.0.0', v2: '2.0.0'}});
        const CheckUpdateCommand = proxyquire(modulePath, {
            '../utils/version': {loadVersions}
        });

        const log = sinon.stub();
        const getInstance = sinon.stub().returns({version: '2.0.0'});

        const cmd = new CheckUpdateCommand({log}, {getInstance});
        await cmd.run({v1: false});

        expect(getInstance.calledOnce).to.be.true;
        expect(loadVersions.calledOnce).to.be.true;
        expect(log.called).to.be.false;
    });

    it('logs out available new version', async function () {
        const loadVersions = sinon.stub().resolves({latest: '2.1.0', latestMajor: {v1: '1.0.0'}});
        const CheckUpdateCommand = proxyquire(modulePath, {
            '../utils/version': {loadVersions}
        });

        const log = sinon.stub();
        const getInstance = sinon.stub().returns({version: '2.0.0'});

        const cmd = new CheckUpdateCommand({log}, {getInstance});
        await cmd.run({v1: false});

        expect(getInstance.calledOnce).to.be.true;
        expect(loadVersions.calledOnce).to.be.true;
        expect(log.calledOnce).to.be.true;
    });

    it('logs out available new version (v1 flag)', async function () {
        const loadVersions = sinon.stub().resolves({latest: '2.0.0', latestMajor: {v1: '1.1.0'}});
        const CheckUpdateCommand = proxyquire(modulePath, {
            '../utils/version': {loadVersions}
        });

        const log = sinon.stub();
        const getInstance = sinon.stub().returns({version: '1.0.0'});

        const cmd = new CheckUpdateCommand({log}, {getInstance});
        await cmd.run({v1: true});

        expect(getInstance.calledOnce).to.be.true;
        expect(loadVersions.calledOnce).to.be.true;
        expect(log.calledOnce).to.be.true;
    });
});
