'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const {SystemError, ProcessError} = require('../../../../../lib/errors');

function stub(execa) {
    return proxyquire('../../../../../lib/commands/doctor/checks/check-permissions', {execa});
}

describe('Unit: Doctor Checks > Util > checkPermissions', function () {
    it('falls back to check owner permissions if not specified', async function () {
        const execa = sinon.stub().resolves({stdout: ''});
        const checkPermissions = stub(execa);

        await checkPermissions();
        expect(execa.calledWithExactly('find ./content ! -group ghost ! -user ghost', {maxBuffer: Infinity, shell: true})).to.be.true;
    });

    it('handles single result correctly', async function () {
        const execa = sinon.stub().resolves({stdout: './test/folder/'});
        const checkPermissions = stub(execa);

        try {
            await checkPermissions('folder');
        } catch (error) {
            expect(error).to.be.an.instanceof(SystemError);
            expect(error.message).to.contain(`Your installation folder contains a directory or file with incorrect permissions:
- ./test/folder/
`);
            expect(execa.calledWithExactly('find ./ -type d ! -perm 775 ! -perm 755', {maxBuffer: Infinity, shell: true})).to.be.true;
        }
    });

    it('handles multiple results correctly', async function () {
        const execa = sinon.stub().resolves({stdout: './test/folder/\n./test/folder2/'});
        const checkPermissions = stub(execa);

        try {
            await checkPermissions('folder');
        } catch (error) {
            expect(error).to.be.an.instanceof(SystemError);
            expect(error.message).to.contain(`Your installation folder contains some directories or files with incorrect permissions:
- ./test/folder/
- ./test/folder2/
`);
            expect(execa.calledWithExactly('find ./ -type d ! -perm 775 ! -perm 755', {maxBuffer: Infinity, shell: true})).to.be.true;
        }
    });

    it('rejects with error if no Ghost can\'t access files', function () {
        const execa = sinon.stub().rejects({stderr: 'Permission denied'});
        const checkPermissions = stub(execa);

        return checkPermissions('folder').then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(SystemError);
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
            expect(error).to.be.an.instanceof(ProcessError);
            expect(error.message).to.match(/oops, cmd could not be executed/);
            expect(execa.calledWithExactly('find ./  -type f ! -path "./versions/*" ! -perm 664 ! -perm 644', {maxBuffer: Infinity, shell: true})).to.be.true;
        });
    });
});
