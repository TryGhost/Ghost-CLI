'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const errors = require('../../../../../lib/errors');
const ghostUser = require('../../../../../lib/utils/use-ghost-user');

const loggedInUser = require('../../../../../lib/commands/doctor/checks/logged-in-user');

describe('Unit: Doctor Checks > loggedInUser', function () {
    afterEach(() => {
        sinon.restore();
    });

    it('enabled works', function () {
        expect(loggedInUser.enabled({
            local: true,
            system: {platform: {linux: true}},
            argv: {}
        }), 'false if local is true').to.be.false;
        expect(loggedInUser.enabled({
            local: false,
            instance: {process: {name: 'local'}},
            system: {platform: {linux: false}}
        }), 'false if local is false and process name is local').to.be.false;
        expect(loggedInUser.enabled({
            local: false,
            instance: {process: {name: 'systemd'}},
            system: {platform: {linux: false}}
        }), 'false if local is false and process name is not local and platform is not linux').to.be.false;
        expect(loggedInUser.enabled({
            local: false,
            instance: {process: {name: 'systemd'}},
            system: {platform: {linux: true}}
        }), 'true if local is false and process name is not local and platform is linux').to.be.true;
        expect(loggedInUser.enabled({
            local: false,
            instance: {process: {name: 'systemd'}},
            system: {platform: {linux: true}},
            argv: {process: 'local'}
        }), 'false if local is false and process name is not local and platform is linux, but argv local is given').to.be.false;
    });

    it('rejects if user name is ghost', function () {
        const processStub = sinon.stub(process, 'getuid').returns(501);
        const ghostUserStub = sinon.stub(ghostUser, 'getGhostUid').returns({uid: 501, guid: 501});

        try {
            loggedInUser.task();
        } catch (error) {
            expect(error).to.exist;
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(processStub.calledOnce).to.be.true;
            expect(ghostUserStub.calledOnce).to.be.true;
        }
    });

    it('passes if user name is not ghost', function () {
        const processStub = sinon.stub(process, 'getuid').returns(1000);
        const ghostUserStub = sinon.stub(ghostUser, 'getGhostUid').returns(false);

        try {
            loggedInUser.task();
            expect(processStub.calledOnce).to.be.true;
            expect(ghostUserStub.calledOnce).to.be.true;
        } catch (error) {
            expect(error).to.not.exist;
        }
    });

    it('passes if ghost user exists but not currently used', function () {
        const processStub = sinon.stub(process, 'getuid').returns(1000);
        const ghostUserStub = sinon.stub(ghostUser, 'getGhostUid').returns({uid: 501, guid: 501});

        try {
            loggedInUser.task();
            expect(processStub.calledOnce).to.be.true;
            expect(ghostUserStub.calledOnce).to.be.true;
        } catch (error) {
            expect(error).to.not.exist;
        }
    });
});
