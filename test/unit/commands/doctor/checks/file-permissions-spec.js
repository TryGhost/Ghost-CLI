'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');

const proxyquire = require('proxyquire');
const errors = require('../../../../../lib/errors');

const modulePath = '../../../../../lib/commands/doctor/checks/file-permissions';

function setup(execaStub) {
    const checkPermissions = proxyquire('../../../../../lib/commands/doctor/checks/check-permissions', {
        execa: {execa: execaStub}
    });

    return proxyquire(modulePath, {'./check-permissions': checkPermissions});
}

const filePermissions = setup(sinon.stub());

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
        const execaStub = sinon.stub().resolves();
        const filePermissions = setup(execaStub);

        expect(filePermissions).to.exist;
        expect(filePermissions.enabled({instance: {process: {name: 'local'}}}), 'skips if no Ghost user should be used').to.be.false;
        expect(execaStub.called).to.be.false;
    });

    it('rejects with error if folders have incorrect permissions', function () {
        const execaStub = sinon.stub().resolves({stdout: './content/images\n./system/apps\n./content/themes'});
        const filePermissions = setup(execaStub);

        expect(filePermissions.enabled({instance: {process: {name: 'systemd'}}}), 'skips if no Ghost user should be used').to.be.true;
        return filePermissions.task({}).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.match(/Your installation folder contains some directories or files with incorrect permissions:/);
            expect(error.message).to.match(/- \.\/system\/apps/);
            expect(error.message).to.match(/sudo find \.\/ ! -path "\.\/versions\/\*" ! -path "\.\/\.pnpm-store\/\*" -type f -exec chmod 664 \{\} \\;/);
            expect(execaStub.called).to.be.true;
        });
    });

    it('rejects with error if files have incorrect permissions', function () {
        const execaStub = sinon.stub().resolves({stdout: './content/images/test.jpg'});
        const filePermissions = setup(execaStub);

        return filePermissions.task({}).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.match(/Your installation folder contains a directory or file with incorrect permissions:/);
            expect(error.message).to.match(/- .\/content\/images\/test.jpg/);
            expect(error.message).to.match(/sudo find \.\/ ! -path "\.\/versions\/\*" ! -path "\.\/\.pnpm-store\/\*" -type f -exec chmod 664 \{\} \\;/);
            expect(execaStub.called).to.be.true;
        });
    });

    it('passes if all folders have the correct permissions', function () {
        const execaStub = sinon.stub().resolves({stdout: ''});
        const filePermissions = setup(execaStub);

        return filePermissions.task({}).then(() => {
            expect(execaStub.called).to.be.true;
        });
    });

    it('rejects with error if execa command fails', function () {
        const execaStub = sinon.stub().rejects(new Error('oops, cmd could not be executed'));
        const filePermissions = setup(execaStub);

        return filePermissions.task({}).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.ProcessError);
            expect(error.message).to.match(/oops, cmd could not be executed/);
            expect(execaStub.called).to.be.true;
        });
    });
});
