'use strict';
const sinon = require('sinon');

const fs = require('node:fs/promises');
const errors = require('../../../../../lib/errors');

const checkDirectoryAndAbove = require('../../../../../lib/commands/doctor/checks/check-directory');

const READABLE = {mode: 0o755};
const UNREADABLE = {mode: 0o750};

describe('Unit: Doctor Checks > checkDirectoryAndAbove', function () {
    afterEach(() => {
        sinon.restore();
    });

    it('returns if directory is root', function () {
        const lstatStub = sinon.stub(fs, 'lstat').resolves();

        return checkDirectoryAndAbove('/').then(() => {
            expect(lstatStub.called).to.be.false;
        });
    });

    it('recursively goes back to root if read is set to true', function () {
        const lstatStub = sinon.stub(fs, 'lstat').resolves(READABLE);

        return checkDirectoryAndAbove('/some/dir').then(() => {
            expect(lstatStub.args).to.deep.equal([
                ['/some/dir'],
                ['/some/']
            ]);
        });
    });

    it('throws error if a directory isn\'t readable by others', function () {
        const lstatStub = sinon.stub(fs, 'lstat');

        lstatStub.onFirstCall().resolves(READABLE);
        lstatStub.onSecondCall().resolves(UNREADABLE);

        return checkDirectoryAndAbove('/root/ghost').then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.match(/directory \/root\/ is not readable/);

            expect(lstatStub.args).to.deep.equal([
                ['/root/ghost'],
                ['/root/']
            ]);
        });
    });
});
