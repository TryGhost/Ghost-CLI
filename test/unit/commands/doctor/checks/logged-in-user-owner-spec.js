'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const os = require('os');
const fs = require('fs');

const execa = require('execa');
const errors = require('../../../../../lib/errors');

const loggedInUserOwner = require('../../../../../lib/commands/doctor/checks/logged-in-user-owner');

describe('Unit: Doctor Checks > loggedInUserOwner', function () {
    const sandbox = sinon.sandbox.create();
    let osStub;

    beforeEach(() => {
        osStub = sandbox.stub(os, 'platform').returns('linux');
    })

    afterEach(() => {
        sandbox.restore();
    });

    it('enabled works', function () {
        expect(loggedInUserOwner.enabled({
            instance: {process: {name: 'local'}}
        }), 'false if process name is local').to.be.false;
    });

    it('skip works', function () {
        osStub.returns('win32');
        expect(loggedInUserOwner.skip(), 'true if platform is not linux').to.be.true;
        expect(osStub.calledOnce).to.be.true;
    });

    describe('Ghost user', function () {
        it('rejects if user is logged in as ghost and ghost owns content folder', function () {
            const uidStub = sandbox.stub(process, 'getuid').returns(1002);
            const gidStub = sandbox.stub(process, 'getgroups').returns([30, 1002]);
            const execaStub = sandbox.stub(execa, 'shellSync');
            const fsStub = sandbox.stub(fs, 'lstatSync');

            execaStub.onFirstCall().returns({stdout: '1002'});
            execaStub.onSecondCall().returns({stdout: '1002'});
            fsStub.onFirstCall().returns({uid: 1000, gid: 1000});
            fsStub.onSecondCall().returns({uid: 1002, gid: 1002});

            return loggedInUserOwner.task().then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.exist;
                expect(uidStub.calledOnce).to.be.true;
                expect(gidStub.calledOnce).to.be.true;
                expect(execaStub.calledWithExactly('id -u ghost')).to.be.true;
                expect(execaStub.calledWithExactly('id -g ghost')).to.be.true;
                expect(error).to.be.an.instanceof(errors.SystemError);
                expect(error.message).to.match(/You can't use Ghost with the ghost user./);
            });
        });

        it('resolves if user is logged in as ghost but ghost doesn\'t own the content folder', function () {
            const uidStub = sandbox.stub(process, 'getuid').returns(1002);
            const gidStub = sandbox.stub(process, 'getgroups').returns([30, 1002]);
            const execaStub = sandbox.stub(execa, 'shellSync');
            const fsStub = sandbox.stub(fs, 'lstatSync');

            execaStub.onFirstCall().returns({stdout: '1002'});
            execaStub.onSecondCall().returns({stdout: '1002'});
            fsStub.onFirstCall().returns({uid: 1002, gid: 1002});
            fsStub.onSecondCall().returns({uid: 1001, gid: 1001});

            return loggedInUserOwner.task().then(() => {
                expect(uidStub.calledOnce).to.be.true;
                expect(gidStub.calledOnce).to.be.true;
                expect(execaStub.calledWithExactly('id -u ghost')).to.be.true;
                expect(execaStub.calledWithExactly('id -g ghost')).to.be.true;
            });
        });
    });

    describe('Other users', function () {
        it('rejects if current user is not owner and not in the same group as owner', function () {
            const uidStub = sandbox.stub(process, 'getuid').returns(1000);
            const gidStub = sandbox.stub(process, 'getgroups').returns([30, 1000]);
            const execaStub = sandbox.stub(execa, 'shellSync');
            const fsStub = sandbox.stub(fs, 'lstatSync');

            execaStub.onFirstCall().returns({stdout: '1002'});
            execaStub.onSecondCall().returns({stdout: '1002'});
            fsStub.onFirstCall().returns({uid: 1001, gid: 1001});
            fsStub.onSecondCall().returns({uid: 1002, gid: 1002});

            return loggedInUserOwner.task().then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.exist;
                expect(uidStub.calledOnce).to.be.true;
                expect(gidStub.calledOnce).to.be.true;
                expect(execaStub.calledWithExactly('id -u ghost')).to.be.true;
                expect(execaStub.calledWithExactly('id -g ghost')).to.be.true;
                expect(error).to.be.an.instanceof(errors.SystemError);
                expect(error.message).to.match(/Your current user is not the owner of the Ghost directory and also not part of the same group./);
            });
        });

        it('shows a warning message, if user is logged in as different user than owner, but same group', function () {
            const uidStub = sandbox.stub(process, 'getuid').returns(1001);
            const gidStub = sandbox.stub(process, 'getgroups').returns([30, 1000]);
            const execaStub = sandbox.stub(execa, 'shellSync');
            const fsStub = sandbox.stub(fs, 'lstatSync');
            const logStub = sandbox.stub();

            const ctx = {
                ui: {log: logStub}
            };

            execaStub.onFirstCall().returns({stdout: '1002'});
            execaStub.onSecondCall().returns({stdout: '1002'});
            fsStub.onFirstCall().returns({uid: 1000, gid: 1000});
            fsStub.onSecondCall().returns({uid: 1002, gid: 1002});

            return loggedInUserOwner.task(ctx).then(() => {
                expect(uidStub.calledOnce).to.be.true;
                expect(gidStub.calledOnce).to.be.true;
                expect(logStub.calledOnce).to.be.true;
                expect(logStub.args[0][0]).to.match(/The current user is not the owner of the Ghost directory. This might cause problems./);
                expect(execaStub.calledWithExactly('id -u ghost')).to.be.true;
                expect(execaStub.calledWithExactly('id -g ghost')).to.be.true;
            });
        });

        it('resolves if current user is also the owner', function () {
            const uidStub = sandbox.stub(process, 'getuid').returns(1000);
            const gidStub = sandbox.stub(process, 'getgroups').returns([30, 1000]);
            // Ghost user doesn't exist this time
            const execaStub = sandbox.stub(execa, 'shellSync').throws(new Error('no such user'));
            const fsStub = sandbox.stub(fs, 'lstatSync');
            const logStub = sandbox.stub();

            const ctx = {
                ui: {log: logStub}
            };

            fsStub.onFirstCall().returns({uid: 1000, gid: 1000});
            fsStub.onSecondCall().returns({uid: 1002, gid: 1002});

            return loggedInUserOwner.task(ctx).then(() => {
                expect(uidStub.calledOnce).to.be.true;
                expect(gidStub.calledOnce).to.be.true;
                expect(logStub.calledOnce).to.be.false;
                expect(execaStub.calledOnce).to.be.true;
            });
        });
    });
});
