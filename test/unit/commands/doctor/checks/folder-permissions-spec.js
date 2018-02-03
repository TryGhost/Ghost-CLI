'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const fs = require('fs-extra');
const errors = require('../../../../../lib/errors');

const modulePath = '../../../../../lib/commands/doctor/checks/folder-permissions';

describe('Unit: Doctor Checks > folderPermissions', function () {
    const sandbox = sinon.sandbox.create();

    afterEach(() => {
        sandbox.restore();
    });

    it('throws error if current directory is not writable', function () {
        const accessStub = sandbox.stub(fs, 'access').rejects();
        const folderPermissions = require(modulePath).task;

        return folderPermissions({}).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.match(/current directory is not writable/);
            expect(accessStub.calledOnce).to.be.true;
            expect(accessStub.calledWith(process.cwd())).to.be.true;
        });
    });

    it('skips checking parent folder permissions if ctx.local is set', function () {
        const accessStub = sandbox.stub(fs, 'access').resolves();
        const checkDirectoryStub = sandbox.stub().resolves();
        const folderPermissions = proxyquire(modulePath, {
            './check-directory': checkDirectoryStub
        }).task;

        return folderPermissions({local: true}).then(() => {
            expect(accessStub.calledOnce).to.be.true;
            expect(checkDirectoryStub.called).to.be.false;
        });
    });

    it('skips checking parent folder permissions if os is not linux', function () {
        const accessStub = sandbox.stub(fs, 'access').resolves();
        const checkDirectoryStub = sandbox.stub().resolves();
        const folderPermissions = proxyquire(modulePath, {
            './check-directory': checkDirectoryStub
        }).task;

        const ctx = {system: {platform: {linux: false}}};

        return folderPermissions(ctx).then(() => {
            expect(accessStub.calledOnce).to.be.true;
            expect(checkDirectoryStub.called).to.be.false;
        });
    });

    it('skips checking parent folder permissions if --no-setup-linux-user is passed', function () {
        const accessStub = sandbox.stub(fs, 'access').resolves();
        const checkDirectoryStub = sandbox.stub().resolves();
        const folderPermissions = proxyquire(modulePath, {
            './check-directory': checkDirectoryStub
        }).task;

        const ctx = {argv: {'setup-linux-user': false}, system: {platform: {linux: false}}};

        return folderPermissions(ctx).then(() => {
            expect(accessStub.calledOnce).to.be.true;
            expect(checkDirectoryStub.called).to.be.false;
        });
    });

    it('runs checkParentAndAbove if local not set and platform is linux', function () {
        const accessStub = sandbox.stub(fs, 'access').resolves();
        const checkDirectoryStub = sandbox.stub().resolves();
        const folderPermissions = proxyquire(modulePath, {
            './check-directory': checkDirectoryStub
        }).task;

        const ctx = {system: {platform: {linux: true}}, argv: {'setup-linux-user': true}};

        return folderPermissions(ctx).then(() => {
            expect(accessStub.calledOnce).to.be.true;
            expect(checkDirectoryStub.calledOnce).to.be.true;
            expect(checkDirectoryStub.calledWith(process.cwd())).to.be.true;
        });
    });
});
