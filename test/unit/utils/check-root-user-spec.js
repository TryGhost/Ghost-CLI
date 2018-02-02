'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const checkRootUser = require('../../../lib/utils/check-root-user');

describe('Unit: Utils > checkRootUser', function () {
    const sandbox = sinon.sandbox.create();

    afterEach(() => {
        sandbox.restore();
    })

    it('throws error command run with root', function () {
        const processStub = sandbox.stub(process, 'getuid').returns(0);
        const exitStub = sandbox.stub(process, 'exit').throws();
        const errorStub = sandbox.stub(console, 'error');

        try {
            checkRootUser('test');
            throw new Error('should not be thrown');
        } catch (e) {
            expect(e.message).to.not.equal('should not be thrown');
            expect(processStub.calledOnce).to.be.true;
            expect(errorStub.calledOnce).to.be.true;
            expect(exitStub.calledOnce).to.be.true;
            expect(errorStub.args[0][0]).to.match(/Can't run command as 'root' user/);
        }
    });

    it('doesn\'t do anything if command run as non root user', function () {
        const processStub = sandbox.stub(process, 'getuid').returns(501);
        const exitStub = sandbox.stub(process, 'exit').throws();
        const errorStub = sandbox.stub(console, 'error');

        checkRootUser('test');
        expect(processStub.calledOnce).to.be.true;
        expect(errorStub.calledOnce).to.be.false;
        expect(exitStub.calledOnce).to.be.false;
    });
});
