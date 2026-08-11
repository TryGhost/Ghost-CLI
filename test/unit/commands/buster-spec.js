'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const modulePath = '../../../lib/commands/buster';

describe('Unit: Commands > Buster', function () {
    it('runs both yarn cache clean and pnpm store prune', function () {
        const yarnStub = sinon.stub().resolves();
        const pnpmStub = sinon.stub().resolves();
        const runStub = sinon.stub().callsFake(function (promise) {
            return promise;
        });
        const BusterCommand = proxyquire(modulePath, {
            '../utils/yarn': yarnStub,
            '../utils/pnpm': pnpmStub
        });
        const instance = new BusterCommand({run: runStub}, {});

        return instance.run().then(() => {
            expect(runStub.calledTwice).to.be.true;
            expect(yarnStub.calledOnce).to.be.true;
            expect(yarnStub.calledWithExactly(['cache', 'clean'])).to.be.true;
            expect(pnpmStub.calledOnce).to.be.true;
            expect(pnpmStub.calledWithExactly(['store', 'prune'])).to.be.true;
        });
    });

    it('succeeds even if pnpm is not installed', function () {
        const yarnStub = sinon.stub().resolves();
        const pnpmStub = sinon.stub().rejects(new Error('pnpm not found'));
        const runStub = sinon.stub().callsFake(function (promise) {
            return promise;
        });
        const BusterCommand = proxyquire(modulePath, {
            '../utils/yarn': yarnStub,
            '../utils/pnpm': pnpmStub
        });
        const instance = new BusterCommand({run: runStub}, {});

        return instance.run().then(() => {
            expect(yarnStub.calledOnce).to.be.true;
            expect(pnpmStub.calledOnce).to.be.true;
        });
    });
});
