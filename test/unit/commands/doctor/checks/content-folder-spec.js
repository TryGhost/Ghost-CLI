'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

function stub(shouldUseGhostUser, checkPermissions) {
    return proxyquire('../../../../../lib/commands/doctor/checks/content-folder', {
        '../../../utils/use-ghost-user': {shouldUseGhostUser},
        './check-permissions': checkPermissions
    });
}

describe('Unit: Doctor Checks > Checking content folder ownership', function () {
    it('exports tasks', function () {
        const contentFolderPermissions = stub(() => {}, () => {});

        expect(contentFolderPermissions).to.be.an.instanceof(Object);
        expect(contentFolderPermissions.title).to.match(/Checking content folder ownership/);
        expect(contentFolderPermissions.task).to.be.an.instanceof(Function);
        expect(contentFolderPermissions.enabled).to.be.an.instanceof(Function);
        expect(contentFolderPermissions.category).to.be.an.instanceof(Array);
        expect(contentFolderPermissions.category).to.have.length(2);
    });

    it('enabled returns false when shouldUseGhostUser returns false', function () {
        const shouldUseGhostUser = sinon.stub().returns(false);
        const contentFolderPermissions = stub(shouldUseGhostUser, () => {});

        expect(contentFolderPermissions.enabled()).to.be.false;
        expect(shouldUseGhostUser.calledOnce).to.be.true;
    });

    it('enabled returns true when shouldUseGhostUser returns true', function () {
        const shouldUseGhostUser = sinon.stub().returns(true);
        const contentFolderPermissions = stub(shouldUseGhostUser, () => {});

        expect(contentFolderPermissions.enabled()).to.be.true;
        expect(shouldUseGhostUser.calledOnce).to.be.true;
    });

    it('task calls checkPermissions', async function () {
        const checkStub = sinon.stub().resolves();
        const contentFolderPermissions = stub(() => true, checkStub);

        await contentFolderPermissions.task();
        expect(checkStub.calledOnce).to.be.true;
        expect(checkStub.calledWithExactly('owner', 'Checking content folder ownership')).to.be.true;
    });
});
