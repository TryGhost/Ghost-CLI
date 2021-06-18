'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');

const execa = require('execa');
const errors = require('../../../../../lib/errors');

const checkPermissions = require('../../../../../lib/commands/doctor/checks/check-permissions');

describe('Unit: Doctor Checks > Util > checkPermissions', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('falls back to check owner permissions if not specified', function () {
        const execaStub = sinon.stub(execa, 'shell').resolves({stdout: ''});

        return checkPermissions().then(() => {
            expect(execaStub.calledWithExactly('find ./content ! -group ghost ! -user ghost', {maxBuffer: Infinity})).to.be.true;
        });
    });

    it('rejects with error if no Ghost can\'t access files', function () {
        const execaStub = sinon.stub(execa, 'shell').rejects({stderr: 'Permission denied'});

        return checkPermissions('folder').then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.match(/Ghost can't access some files or directories to check for correct permissions./);
            expect(execaStub.calledWithExactly('find ./ -type d ! -perm 775 ! -perm 755', {maxBuffer: Infinity})).to.be.true;
        });
    });

    it('rejects with error if execa command fails', function () {
        const execaStub = sinon.stub(execa, 'shell').rejects(new Error('oops, cmd could not be executed'));

        return checkPermissions('files').then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.ProcessError);
            expect(error.message).to.match(/oops, cmd could not be executed/);
            expect(execaStub.calledWithExactly('find ./  -type f ! -path "./versions/*" ! -perm 664 ! -perm 644', {maxBuffer: Infinity})).to.be.true;
        });
    });
});
