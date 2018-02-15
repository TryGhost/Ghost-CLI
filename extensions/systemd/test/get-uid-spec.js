'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const modulePath = '../get-uid';

describe('Unit: Systemd > get-uid util', function () {
    it('throws ProcessError if execa error is not an expected one, but is stderr', function () {
        const shellStub = sinon.stub().throws(new Error('some error'));
        const getUid = proxyquire(modulePath, {
            execa: {shellSync: shellStub}
        });

        try {
            getUid('/some/dir');
            expect(false, 'error should have been thrown').to.be.true;
        } catch (e) {
            const errors = require('../../../lib/errors');
            expect(e).to.be.an.instanceof(errors.ProcessError);
            expect(e.message).to.equal('some error');
            expect(shellStub.calledOnce).to.be.true;
        }
    });

    it('returns null if ghost user doesn\'t exist', function () {
        const shellStub = sinon.stub().throws(new Error('No such user'));
        const getUid = proxyquire(modulePath, {
            execa: {shellSync: shellStub}
        });

        const result = getUid('/some/dir');
        expect(result).to.be.null;
        expect(shellStub.calledOnce).to.be.true;
    });

    it('returns null if owner of folder is not the ghost user', function () {
        const shellStub = sinon.stub().returns({stdout: '42'});
        const lstatStub = sinon.stub().returns({uid: 1});
        const getUid = proxyquire(modulePath, {
            fs: {lstatSync: lstatStub},
            execa: {shellSync: shellStub}
        });

        const result = getUid('/some/dir');
        expect(result).to.be.null;
        expect(shellStub.calledOnce).to.be.true;
        expect(lstatStub.calledOnce).to.be.true;
        expect(lstatStub.calledWithExactly('/some/dir/content')).to.be.true;
    });

    it('returns uid if owner of content folder is the ghost user', function () {
        const shellStub = sinon.stub().returns({stdout: '42'});
        const lstatStub = sinon.stub().returns({uid: 42});
        const getUid = proxyquire(modulePath, {
            fs: {lstatSync: lstatStub},
            execa: {shellSync: shellStub}
        });

        const result = getUid('/some/dir');
        expect(result).to.equal('42');
        expect(shellStub.calledOnce).to.be.true;
        expect(lstatStub.calledOnce).to.be.true;
        expect(lstatStub.calledWithExactly('/some/dir/content')).to.be.true;
    });
});
