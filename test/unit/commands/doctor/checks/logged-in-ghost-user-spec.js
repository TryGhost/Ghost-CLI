'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const fs = require('fs');

const errors = require('../../../../../lib/errors');
const ghostUser = require('../../../../../lib/utils/use-ghost-user');

const loggedInGhostUser = require('../../../../../lib/commands/doctor/checks/logged-in-ghost-user');

describe('Unit: Doctor Checks > loggedInGhostUser', function () {
    afterEach(() => {
        sinon.restore();
    });

    it('enabled works', function () {
        expect(loggedInGhostUser.enabled({
            system: {platform: {linux: false}}
        }), 'false if platform is not linux').to.be.false;
    });

    it('skip works', function () {
        expect(loggedInGhostUser.skip({
            instance: {process: {name: 'local'}}
        }), 'true if local process manager').to.be.true;
    });

    it('rejects if user is logged in as ghost and ghost owns content folder', function () {
        const uidStub = sinon.stub(process, 'getuid').returns(1002);
        const ghostUserStub = sinon.stub(ghostUser, 'getGhostUid').returns({uid: 1002, guid: 1002});
        const fsStub = sinon.stub(fs, 'lstatSync').returns({uid: 1002, gid: 1002});

        try {
            loggedInGhostUser.task();
            expect(false, 'error should have been thrown').to.be.true;
        } catch (error) {
            expect(error).to.exist;
            expect(uidStub.calledOnce).to.be.true;
            expect(fsStub.calledOnce).to.be.true;
            expect(ghostUserStub.calledOnce).to.be.true;
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.match(/You can't run commands with the "ghost" user./);
        }
    });

    it('resolves if user is logged in as ghost but ghost doesn\'t own the content folder', function () {
        const uidStub = sinon.stub(process, 'getuid').returns(1002);
        const ghostUserStub = sinon.stub(ghostUser, 'getGhostUid').returns({uid: 1002, guid: 1002});
        const fsStub = sinon.stub(fs, 'lstatSync').returns({uid: 1001, gid: 1001});

        loggedInGhostUser.task();
        expect(uidStub.calledOnce).to.be.true;
        expect(fsStub.calledOnce).to.be.true;
        expect(ghostUserStub.calledOnce).to.be.true;
    });

    it('resolves if ghost user doesn\'t exist', function () {
        const uidStub = sinon.stub(process, 'getuid').returns(1002);
        const ghostUserStub = sinon.stub(ghostUser, 'getGhostUid').returns(false);
        const fsStub = sinon.stub(fs, 'lstatSync').returns({uid: 1001, gid: 1001});

        loggedInGhostUser.task();
        expect(uidStub.calledOnce).to.be.true;
        expect(fsStub.calledOnce).to.be.true;
        expect(ghostUserStub.calledOnce).to.be.true;
    });
});
