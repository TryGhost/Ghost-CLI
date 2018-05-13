'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');

const execa = require('execa');
const errors = require('../../../../../lib/errors');

const contentFolderPermissions = require('../../../../../lib/commands/doctor/checks/content-folder');

describe('Unit: Doctor Checks > Checking content folder ownership', function () {
    const shouldUseGhostUserStub = sinon.stub();

    afterEach(() => {
        sinon.restore();
    });

    it('exports tasks', function () {
        expect(contentFolderPermissions).to.be.an.instanceof(Object);
        expect(contentFolderPermissions.title).to.match(/Checking content folder ownership/);
        expect(contentFolderPermissions.task).to.be.an.instanceof(Function);
        expect(contentFolderPermissions.enabled).to.be.an.instanceof(Function);
        expect(contentFolderPermissions.category).to.be.an.instanceof(Array);
        expect(contentFolderPermissions.category).to.have.length(2);
    });

    it('skips when content folder is not owned by ghost', function () {
        shouldUseGhostUserStub.returns(false);
        const execaStub = sinon.stub(execa, 'shell').resolves();

        expect(contentFolderPermissions).to.exist;
        expect(contentFolderPermissions.enabled(), 'skips if no Ghost user should be used').to.be.false;
        expect(execaStub.called).to.be.false;
    });

    it('rejects with error if folders have incorrect permissions', function () {
        const execaStub = sinon.stub(execa, 'shell').resolves({stdout: './content/images\n./content/apps\n./content/themes'});

        shouldUseGhostUserStub.returns(true);

        return contentFolderPermissions.task({}).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.match(/Your installation folder contains some directories or files with incorrect permissions:/);
            expect(error.message).to.match(/- \.\/content\/images/);
            expect(error.message).to.match(/sudo chown -R ghost:ghost \.\/content/);
            expect(execaStub.called).to.be.true;
        });
    });

    it('rejects with error if files have incorrect permissions', function () {
        const execaStub = sinon.stub(execa, 'shell').resolves({stdout: './content/images/test.jpg'});

        shouldUseGhostUserStub.returns(true);

        return contentFolderPermissions.task({}).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.match(/Your installation folder contains a directory or file with incorrect permissions:/);
            expect(error.message).to.match(/- .\/content\/images\/test.jpg/);
            expect(error.message).to.match(/sudo chown -R ghost:ghost \.\/content/);
            expect(execaStub.called).to.be.true;
        });
    });

    it('passes if all folders have the correct permissions', function () {
        const execaStub = sinon.stub(execa, 'shell').resolves({stdout: ''});

        shouldUseGhostUserStub.returns(true);

        return contentFolderPermissions.task({}).then(() => {
            expect(execaStub.called).to.be.true;
        });
    });

    it('rejects with error if execa command fails', function () {
        const execaStub = sinon.stub(execa, 'shell').rejects(new Error('oops, cmd could not be executed'));

        shouldUseGhostUserStub.returns(true);

        return contentFolderPermissions.task({}).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.ProcessError);
            expect(error.message).to.match(/oops, cmd could not be executed/);
            expect(execaStub.called).to.be.true;
        });
    });
});
