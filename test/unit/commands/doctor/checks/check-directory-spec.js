'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const fs = require('fs-extra');
const errors = require('../../../../../lib/errors');

const modulePath = '../../../../../lib/commands/doctor/checks/check-directory';

describe('Unit: Doctor Checks > checkDirectoryAndAbove', function () {
    afterEach(() => {
        sinon.restore();
    });

    it('returns if directory is root', function () {
        const lstatStub = sinon.stub(fs, 'lstat').resolves();
        const isRootStub = sinon.stub().returns(true);

        const checkDirectoryAndAbove = proxyquire(modulePath, {
            'path-is-root': isRootStub
        });

        return checkDirectoryAndAbove('/some/dir').then(() => {
            expect(lstatStub.called).to.be.false;
            expect(isRootStub.calledOnce).to.be.true;
            expect(isRootStub.calledWithExactly('/some/dir')).to.be.true;
        });
    });

    it('recursively goes back to root if read is set to true', function () {
        const lstatStub = sinon.stub(fs, 'lstat').resolves({stats: true});
        const isRootStub = sinon.stub();
        const modeStub = sinon.stub().returns({others: {read: true}});
        isRootStub.onFirstCall().returns(false);
        isRootStub.onSecondCall().returns(false);
        isRootStub.onThirdCall().returns(true);

        const checkDirectoryAndAbove = proxyquire(modulePath, {
            'path-is-root': isRootStub,
            'stat-mode': modeStub
        });

        return checkDirectoryAndAbove('/some/dir').then(() => {
            expect(lstatStub.calledTwice).to.be.true;
            expect(modeStub.calledTwice).to.be.true;
            expect(isRootStub.calledThrice).to.be.true;

            expect(isRootStub.args).to.deep.equal([
                ['/some/dir'],
                ['/some/'],
                ['/']
            ]);
        });
    });

    it('recursively goes back to root if read is set to true', function () {
        const lstatStub = sinon.stub(fs, 'lstat').resolves({stats: true});
        const isRootStub = sinon.stub();
        const modeStub = sinon.stub().returns({others: {read: true}});
        isRootStub.onFirstCall().returns(false);
        isRootStub.onSecondCall().returns(false);
        isRootStub.onThirdCall().returns(true);

        const checkDirectoryAndAbove = proxyquire(modulePath, {
            'path-is-root': isRootStub,
            'stat-mode': modeStub
        });

        return checkDirectoryAndAbove('/some/dir').then(() => {
            expect(lstatStub.calledTwice).to.be.true;
            expect(modeStub.calledTwice).to.be.true;
            expect(isRootStub.calledThrice).to.be.true;

            expect(isRootStub.args).to.deep.equal([
                ['/some/dir'],
                ['/some/'],
                ['/']
            ]);
        });
    });

    it('throws error if a directory isn\'t readable by others', function () {
        const lstatStub = sinon.stub(fs, 'lstat').resolves({stats: true});
        const isRootStub = sinon.stub();
        const modeStub = sinon.stub();

        isRootStub.onFirstCall().returns(false);
        isRootStub.onSecondCall().returns(false);
        isRootStub.onThirdCall().returns(true);

        modeStub.onFirstCall().returns({others: {read: true}});
        modeStub.onSecondCall().returns({others: {read: false}});

        const checkDirectoryAndAbove = proxyquire(modulePath, {
            'path-is-root': isRootStub,
            'stat-mode': modeStub
        });

        return checkDirectoryAndAbove('/root/ghost').then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.match(/directory \/root\/ is not readable/);

            expect(isRootStub.calledTwice).to.be.true;
            expect(lstatStub.calledTwice).to.be.true;
            expect(modeStub.calledTwice).to.be.true;
        });
    });
});
