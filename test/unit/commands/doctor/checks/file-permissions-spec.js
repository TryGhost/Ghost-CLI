'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');

const execa = require('execa');
const errors = require('../../../../../lib/errors');

const filePermissions = require('../../../../../lib/commands/doctor/checks/file-permissions');

describe('Unit: Doctor Checks > Checking file permissions', function () {
    afterEach(() => {
        sinon.restore();
    });

    it('exports tasks', function () {
        expect(filePermissions).to.be.an.instanceof(Object);
        expect(filePermissions.title).to.match(/Checking file permissions/);
        expect(filePermissions.task).to.be.an.instanceof(Function);
        expect(filePermissions.enabled).to.be.an.instanceof(Function);
        expect(filePermissions.category).to.be.an.instanceof(Array);
        expect(filePermissions.category).to.have.length(2);
    });

    it('skips when content when ghost is locally installed', function () {
        const execaStub = sinon.stub(execa, 'shell').resolves();

        expect(filePermissions).to.exist;
        expect(filePermissions.enabled({instance: {process: {name: 'local'}}}), 'skips if no Ghost user should be used').to.be.false;
        expect(execaStub.called).to.be.false;
    });

    it('rejects with error if folders have incorrect permissions', function () {
        const execaStub = sinon.stub(execa, 'shell').resolves({stdout: './content/images\n./system/apps\n./content/themes'});

        expect(filePermissions.enabled({instance: {process: {name: 'systemd'}}}), 'skips if no Ghost user should be used').to.be.true;
        return filePermissions.task({}).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.match(/Your installation folder contains some directories or files with incorrect permissions:/);
            expect(error.message).to.match(/- \.\/system\/apps/);
            expect(error.message).to.match(/sudo find \.\/ ! -path "\.\/versions\/\*" -type f -exec chmod 664 \{\} \\;/);
            expect(execaStub.called).to.be.true;
        });
    });

    it('rejects with error if files have incorrect permissions', function () {
        const execaStub = sinon.stub(execa, 'shell').resolves({stdout: './content/images/test.jpg'});

        return filePermissions.task({}).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.match(/Your installation folder contains a directory or file with incorrect permissions:/);
            expect(error.message).to.match(/- .\/content\/images\/test.jpg/);
            expect(error.message).to.match(/sudo find \.\/ ! -path "\.\/versions\/\*" -type f -exec chmod 664 \{\} \\;/);
            expect(execaStub.called).to.be.true;
        });
    });

    it('passes if all folders have the correct permissions', function () {
        const execaStub = sinon.stub(execa, 'shell').resolves({stdout: ''});

        return filePermissions.task({}).then(() => {
            expect(execaStub.called).to.be.true;
        });
    });

    it('rejects with error if execa command fails', function () {
        const execaStub = sinon.stub(execa, 'shell').rejects(new Error('oops, cmd could not be executed'));

        return filePermissions.task({}).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.ProcessError);
            expect(error.message).to.match(/oops, cmd could not be executed/);
            expect(execaStub.called).to.be.true;
        });
    });
});
