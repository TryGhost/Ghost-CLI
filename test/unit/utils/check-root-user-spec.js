'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const os = require('os');
const checkRootUser = require('../../../lib/utils/check-root-user');

describe('checkRootUser', function () {
    const sandbox = sinon.sandbox.create();

    afterEach(() => {
        sandbox.restore();
    });

    it('skips check if run on windows', function () {
        const osStub = sandbox.stub(os, 'platform').returns('win32');
        const processStub = sandbox.stub(process, 'getuid').returns(0);

        checkRootUser('test');
        expect(osStub.calledOnce).to.be.true;
        expect(processStub.called).to.be.false;
    });

    it('skips check if run on macos', function () {
        const osStub = sandbox.stub(os, 'platform').returns('darwin');
        const processStub = sandbox.stub(process, 'getuid').returns(0);

        checkRootUser('test');
        expect(osStub.calledOnce).to.be.true;
        expect(processStub.called).to.be.false;
    });

    it('throws error command run with root', function () {
        const osStub = sandbox.stub(os, 'platform').returns('linux');
        const processStub = sandbox.stub(process, 'getuid').returns(0);
        const exitStub = sandbox.stub(process, 'exit').throws();
        const errorStub = sandbox.stub(console, 'error');

        try {
            checkRootUser('test');
            throw new Error('should not be thrown');
        } catch (e) {
            expect(e.message).to.not.equal('should not be thrown');
            expect(osStub.calledOnce).to.be.true;
            expect(processStub.calledOnce).to.be.true;
            expect(errorStub.calledOnce).to.be.true;
            expect(exitStub.calledOnce).to.be.true;
            expect(errorStub.args[0][0]).to.match(/Can't run command as 'root' user/);
        }
    });

    it('doesn\'t do anything if command run as non root user', function () {
        const osStub = sandbox.stub(os, 'platform').returns('linux');
        const processStub = sandbox.stub(process, 'getuid').returns(501);
        const exitStub = sandbox.stub(process, 'exit').throws();
        const errorStub = sandbox.stub(console, 'error');

        checkRootUser('test');
        expect(osStub.calledOnce).to.be.true;
        expect(processStub.calledOnce).to.be.true;
        expect(errorStub.calledOnce).to.be.false;
        expect(exitStub.calledOnce).to.be.false;
    });
});
