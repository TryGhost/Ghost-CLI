'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const errors = require('../../../../../lib/errors');

function stub(execa) {
    return proxyquire('../../../../../lib/commands/doctor/checks/check-permissions', {execa});
}

describe('Unit: Doctor Checks > Util > checkPermissions', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('falls back to check owner permissions if not specified', function () {
        const execa = sinon.stub().resolves({stdout: ''});
        const checkPermissions = stub(execa);

        return checkPermissions().then(() => {
            expect(execa.calledWithExactly('find ./content ! -group ghost ! -user ghost', {maxBuffer: Infinity, shell: true})).to.be.true;
        });
    });

    it('rejects with error if no Ghost can\'t access files', function () {
        const execa = sinon.stub().rejects({stderr: 'Permission denied'});
        const checkPermissions = stub(execa);

        return checkPermissions('folder').then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.match(/Ghost can't access some files or directories to check for correct permissions./);
            expect(execa.calledWithExactly('find ./ -type d ! -perm 775 ! -perm 755', {maxBuffer: Infinity, shell: true})).to.be.true;
        });
    });

    it('rejects with error if execa command fails', function () {
        const execa = sinon.stub().rejects(new Error('oops, cmd could not be executed'));
        const checkPermissions = stub(execa);

        return checkPermissions('files').then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.ProcessError);
            expect(error.message).to.match(/oops, cmd could not be executed/);
            expect(execa.calledWithExactly('find ./  -type f ! -path "./versions/*" ! -perm 664 ! -perm 644', {maxBuffer: Infinity, shell: true})).to.be.true;
        });
    });
});
