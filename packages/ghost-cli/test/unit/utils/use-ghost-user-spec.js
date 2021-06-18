'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');

const ghostUser = require('../../../lib/utils/use-ghost-user');
const os = require('os');
const execa = require('execa');
const fs = require('fs');

describe('Unit: Utils > ghostUser', function () {
    afterEach(() => {
        sinon.restore();
    });

    describe('shouldUseGhostUser', function () {
        it('returns false if platform is not linux', function () {
            const platformStub = sinon.stub(os, 'platform').returns('darwin');

            const result = ghostUser.shouldUseGhostUser();

            expect(platformStub.calledOnce).to.be.true;
            expect(result).to.be.false;
        });

        it('returns false if no ghost user found', function () {
            const platformStub = sinon.stub(os, 'platform').returns('linux');
            const execaStub = sinon.stub(execa, 'shellSync').throws(new Error('no such user'));

            const result = ghostUser.shouldUseGhostUser();

            expect(platformStub.calledTwice).to.be.true;
            expect(execaStub.calledOnce).to.be.true;
            expect(result).to.be.false;
        });

        it('returns false if the ghost owner/group is not the owner of the content folder', function () {
            const platformStub = sinon.stub(os, 'platform').returns('linux');
            const execaStub = sinon.stub(execa, 'shellSync').returns({stdout: '50'});
            const fsStub = sinon.stub(fs, 'lstatSync').returns({uid: 30, gid: 30});

            const result = ghostUser.shouldUseGhostUser('/some-dir/content');
            expect(result).to.be.false;
            expect(platformStub.calledTwice).to.be.true;
            expect(execaStub.calledTwice).to.be.true;
            expect(fsStub.calledOnce).to.be.true;
            expect(fsStub.args[0][0]).to.equal('/some-dir/content');
        });

        it('returns false if the current user is ghost', function () {
            const platformStub = sinon.stub(os, 'platform').returns('linux');
            const execaStub = sinon.stub(execa, 'shellSync').returns({stdout: '50'});
            const fsStub = sinon.stub(fs, 'lstatSync').returns({uid: 50, gid: 50});

            const originalGetuid = process.getuid;
            process.getuid = sinon.stub().returns(50);

            const result = ghostUser.shouldUseGhostUser('/some-dir/content');
            expect(result).to.be.false;
            expect(platformStub.calledTwice).to.be.true;
            expect(execaStub.calledTwice).to.be.true;
            expect(fsStub.calledOnce).to.be.true;
            expect(process.getuid.calledOnce).to.be.true;

            process.getuid = originalGetuid;
        });

        it('returns true if user is not ghost', function () {
            const platformStub = sinon.stub(os, 'platform').returns('linux');
            const execaStub = sinon.stub(execa, 'shellSync').returns({stdout: '50'});
            const fsStub = sinon.stub(fs, 'lstatSync').returns({uid: 50, gid: 50});

            const originalGetuid = process.getuid;
            process.getuid = sinon.stub().returns(0);

            const result = ghostUser.shouldUseGhostUser('/some-dir/content');
            expect(result).to.be.true;
            expect(platformStub.calledTwice).to.be.true;
            expect(execaStub.calledTwice).to.be.true;
            expect(fsStub.calledOnce).to.be.true;
            expect(process.getuid.calledOnce).to.be.true;

            process.getuid = originalGetuid;
        });
    });

    describe('getGhostUid', function () {
        it('returns false if platform is not linux', function () {
            const platformStub = sinon.stub(os, 'platform').returns('darwin');

            const result = ghostUser.getGhostUid();

            expect(platformStub.calledOnce).to.be.true;
            expect(result).to.be.false;
        });

        it('returns uid and guid object', function () {
            const platformStub = sinon.stub(os, 'platform').returns('linux');
            const execaStub = sinon.stub(execa, 'shellSync').returns({stdout: 501});

            const result = ghostUser.getGhostUid();
            expect(result).to.be.an('object');
            expect(result.uid).to.equal(501);
            expect(result.gid).to.equal(501);
            expect(platformStub.calledOnce).to.be.true;
            expect(execaStub.calledTwice).to.be.true;
        });

        it('returns false if "no such user" error is thrown', function () {
            const platformStub = sinon.stub(os, 'platform').returns('linux');
            const execaStub = sinon.stub(execa, 'shellSync').throws(new Error('no such user'));

            const result = ghostUser.getGhostUid();
            expect(result).to.be.false;
            expect(platformStub.calledOnce).to.be.true;
            expect(execaStub.calledOnce).to.be.true;
        });
    });
});
