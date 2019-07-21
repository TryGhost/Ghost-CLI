'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

function stub(checkPermissions) {
    return proxyquire('../../../../../lib/commands/doctor/checks/file-permissions', {
        './check-permissions': checkPermissions
    });
}

describe('Unit: Doctor Checks > Checking file permissions', function () {
    it('exports tasks', function () {
        const filePermissions = stub(() => {});

        expect(filePermissions).to.be.an.instanceof(Object);
        expect(filePermissions.title).to.match(/Checking file permissions/);
        expect(filePermissions.task).to.be.an.instanceof(Function);
        expect(filePermissions.enabled).to.be.an.instanceof(Function);
        expect(filePermissions.category).to.be.an.instanceof(Array);
        expect(filePermissions.category).to.have.length(2);
    });

    it('enabled returns false when process manager is local', function () {
        const filePermissions = stub(() => {});
        const instance = {process: {name: 'local'}};

        expect(filePermissions.enabled({instance})).to.be.false;
    });

    it('enabled returns true when process manager is not local', function () {
        const filePermissions = stub(() => {});
        const instance = {process: {name: 'systemd'}};

        expect(filePermissions.enabled({instance})).to.be.true;
    });

    it('task calls checkPermissions', async function () {
        const checkPermissions = sinon.stub().resolves();
        const filePermissions = stub(checkPermissions);

        await filePermissions.task();
        expect(checkPermissions.calledOnce).to.be.true;
        expect(checkPermissions.calledWithExactly('files', 'Checking file permissions'));
    });
});
