'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

function stub(checkPermissions) {
    return proxyquire('../../../../../lib/commands/doctor/checks/folder-permissions', {
        './check-permissions': checkPermissions
    });
}

describe('Unit: Doctor Checks > Checking folder permissions', function () {
    it('exports tasks', function () {
        const folderPermissions = stub(() => {});

        expect(folderPermissions).to.be.an.instanceof(Object);
        expect(folderPermissions.title).to.match(/Checking folder permissions/);
        expect(folderPermissions.task).to.be.an.instanceof(Function);
        expect(folderPermissions.enabled).to.be.an.instanceof(Function);
        expect(folderPermissions.category).to.be.an.instanceof(Array);
        expect(folderPermissions.category).to.have.length(2);
    });

    it('enabled returns false when process manager is local', function () {
        const folderPermissions = stub(() => {});
        const instance = {process: {name: 'local'}};

        expect(folderPermissions.enabled({instance})).to.be.false;
    });

    it('enabled returns true when process manager is not local', function () {
        const folderPermissions = stub(() => {});
        const instance = {process: {name: 'systemd'}};

        expect(folderPermissions.enabled({instance})).to.be.true;
    });

    it('task calls checkPermissions', async function () {
        const checkPermissions = sinon.stub().resolves();
        const folderPermissions = stub(checkPermissions);

        await folderPermissions.task();
        expect(checkPermissions.calledOnce).to.be.true;
        expect(checkPermissions.calledWithExactly('folder', 'Checking folder permissions'));
    });
});
