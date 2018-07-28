'use strict';
const {expect} = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const {SystemError} = require('../../../lib/errors');
const modulePath = '../../../lib/utils/get-instance';

describe('Unit: Utils > getInstance', function () {
    let getInstance, stubs, system;
    beforeEach(function () {
        stubs = {
            checkValidInstall: sinon.stub().callsFake(a => a),
            chdir: sinon.stub(process, 'chdir'),
            getInstance: sinon.stub().returns('It\'s-a Me, Mario!')
        };

        system = {getInstance: stubs.getInstance};
        getInstance = proxyquire(modulePath, {
            './check-valid-install': stubs.checkValidInstall
        });
    });

    this.afterEach(function () {
        sinon.restore();
    });

    it('Doesn\'t change directory by default', function () {
        const result = getInstance(undefined, system, 'test');

        expect(result).to.equal('It\'s-a Me, Mario!');
        expect(stubs.getInstance.calledOnce).to.be.true;
        expect(stubs.chdir.called).to.be.false;
        expect(stubs.checkValidInstall.calledOnce).to.be.true;
        expect(stubs.checkValidInstall.calledWithExactly('test')).to.be.true;
    });

    it('Fails if the instance cannot be found', function () {
        stubs.getInstance.returns(null);

        try {
            getInstance('ghosted', system, 'test');
            expect(false, 'Promise should have rejected').to.be.true;
        } catch (error) {
            expect(error).to.be.instanceof(SystemError);
            expect(error.message).to.equal('Ghost instance "ghosted" does not exist');
        }
    });

    it('Chdirs into instance directory when it exists', function () {
        const dir = '/path/to/ghost';
        stubs.getInstance.returns({dir});

        const result = getInstance('i', system, 'test');

        expect(result.dir).to.equal(dir);
        expect(stubs.chdir.calledOnce).to.to.true;
        expect(stubs.chdir.calledWithExactly(dir)).to.be.true;
    });
})
