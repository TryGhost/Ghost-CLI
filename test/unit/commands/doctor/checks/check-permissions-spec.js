'use strict';
const sinon = require('sinon');

const proxyquire = require('proxyquire');
const errors = require('../../../../../lib/errors');

const modulePath = '../../../../../lib/commands/doctor/checks/check-permissions';

function setup(execaStub) {
    return proxyquire(modulePath, {
        execa: {execa: execaStub}
    });
}

describe('Unit: Doctor Checks > Util > checkPermissions', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('falls back to check owner permissions if not specified', function () {
        const execaStub = sinon.stub().resolves({stdout: ''});
        const checkPermissions = setup(execaStub);

        return checkPermissions().then(() => {
            expect(execaStub.calledWithExactly('find ./content ! -group ghost ! -user ghost', {shell: true, maxBuffer: Infinity})).to.be.true;
        });
    });

    it('rejects with error if no Ghost can\'t access files', function () {
        const execaStub = sinon.stub().rejects({stderr: 'Permission denied'});
        const checkPermissions = setup(execaStub);

        return checkPermissions('folder').then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.match(/Ghost can't access some files or directories to check for correct permissions./);
            expect(execaStub.calledWithExactly('find ./ -type d ! -perm 775 ! -perm 755', {shell: true, maxBuffer: Infinity})).to.be.true;
        });
    });

    it('rejects with error if execa command fails', function () {
        const execaStub = sinon.stub().rejects(new Error('oops, cmd could not be executed'));
        const checkPermissions = setup(execaStub);

        return checkPermissions('files').then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.ProcessError);
            expect(error.message).to.match(/oops, cmd could not be executed/);
            expect(execaStub.calledWithExactly('find ./  -type f ! -path "./versions/*" ! -path "./.pnpm-store/*" ! -perm 664 ! -perm 644', {shell: true, maxBuffer: Infinity})).to.be.true;
        });
    });
});
