'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const fs = require('fs');

const errors = require('../../../../../lib/errors');

const loggedInUserOwner = require('../../../../../lib/commands/doctor/checks/logged-in-user-owner');

describe('Unit: Doctor Checks > loggedInUserOwner', function () {
    afterEach(() => {
        sinon.restore();
    });

    it('enabled works', function () {
        expect(loggedInUserOwner.enabled({
            system: {platform: {linux: false}}
        }), 'false if platform is not linux').to.be.false;
    });

    it('skip works', function () {
        expect(loggedInUserOwner.skip({
            instance: {process: {name: 'local'}}
        }), 'true if local process manager').to.be.true;
    });

    it('rejects if current user is not owner and not in the same group as owner', function () {
        const uidStub = sinon.stub(process, 'getuid').returns(1000);
        const gidStub = sinon.stub(process, 'getgroups').returns([30, 1000]);
        const fsStub = sinon.stub(fs, 'lstatSync');

        fsStub.onFirstCall().returns({uid: 1001, gid: 1001});
        fsStub.onSecondCall().returns({uid: 1002, gid: 1002});

        try {
            loggedInUserOwner.task();
            expect(false, 'error should have been thrown').to.be.true;
        } catch (error) {
            expect(error).to.exist;
            expect(uidStub.calledOnce).to.be.true;
            expect(gidStub.calledOnce).to.be.true;
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.match(/Your user does not own the directory/);
        }
    });

    it('shows a warning message, if user is logged in as different user than owner, but same group', function () {
        const uidStub = sinon.stub(process, 'getuid').returns(1001);
        const gidStub = sinon.stub(process, 'getgroups').returns([30, 1000]);
        const fsStub = sinon.stub(fs, 'lstatSync');
        const logStub = sinon.stub();

        const ctx = {
            ui: {log: logStub}
        };

        fsStub.onFirstCall().returns({uid: 1000, gid: 1000});
        fsStub.onSecondCall().returns({uid: 1002, gid: 1002});

        loggedInUserOwner.task(ctx);
        expect(uidStub.calledOnce).to.be.true;
        expect(gidStub.calledOnce).to.be.true;
        expect(logStub.calledOnce).to.be.true;
        expect(logStub.args[0][0]).to.match(/Your user does not own the directory/);
    });

    it('resolves if current user is also the owner', function () {
        const uidStub = sinon.stub(process, 'getuid').returns(1000);
        const gidStub = sinon.stub(process, 'getgroups').returns([30, 1000]);
        const fsStub = sinon.stub(fs, 'lstatSync');
        const logStub = sinon.stub();

        const ctx = {
            ui: {log: logStub}
        };

        fsStub.onFirstCall().returns({uid: 1000, gid: 1000});
        fsStub.onSecondCall().returns({uid: 1002, gid: 1002});

        loggedInUserOwner.task(ctx);
        expect(uidStub.calledOnce).to.be.true;
        expect(gidStub.calledOnce).to.be.true;
        expect(logStub.calledOnce).to.be.false;
    });

    it('rejects and passes the error if ghostUser util throws error', function () {
        const uidStub = sinon.stub(process, 'getuid').returns(1000);
        const gidStub = sinon.stub(process, 'getgroups').returns([30, 1000]);
        const fsStub = sinon.stub(fs, 'lstatSync');

        fsStub.onFirstCall().returns({uid: 1000, gid: 1000});
        fsStub.onSecondCall().returns({uid: 1002, gid: 1002});

        loggedInUserOwner.task();
        expect(uidStub.calledOnce).to.be.true;
        expect(gidStub.calledOnce).to.be.true;
    });
});
