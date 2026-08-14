'use strict';
const sinon = require('sinon');
const {setupTestFolder, cleanupTestFolders} = require('../../utils/test-folder');
const fs = require('fs');
const path = require('path');

const ensureStructure = require('../../../lib/tasks/ensure-structure');

describe('Unit: Tasks > ensure-structure', function () {
    afterAll(() => {
        cleanupTestFolders();
    });

    it('works', async function () {
        const env = setupTestFolder();
        const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);

        await ensureStructure();
        expect(cwdStub.calledOnce).to.be.true;

        const expectedFiles = [
            'versions',
            'content/apps',
            'content/themes',
            'content/data',
            'content/images',
            'content/logs',
            'content/settings'
        ];

        expectedFiles.forEach((file) => {
            expect(fs.existsSync(path.join(env.dir, file))).to.be.true;
        });

        cwdStub.restore();
    });
});
