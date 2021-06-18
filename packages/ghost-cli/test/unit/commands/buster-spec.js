'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const modulePath = '../../../lib/commands/buster';

describe('Unit: Commands > Buster', function () {
    it('runs yarn cache clean', function () {
        const yarnStub = sinon.stub().resolves();
        const runStub = sinon.stub().callsFake(function (yarn, text) {
            expect(yarn).to.be.an.instanceof(Promise);
            expect(text).to.equal('Clearing yarn cache');
            return yarn;
        });
        const BusterCommand = proxyquire(modulePath, {
            '../utils/yarn': yarnStub
        });
        const instance = new BusterCommand({run: runStub}, {});

        return instance.run().then(() => {
            expect(runStub.calledOnce).to.be.true;
            expect(yarnStub.calledOnce).to.be.true;
            expect(yarnStub.calledWithExactly(['cache', 'clean'])).to.be.true;
        });
    });
});
