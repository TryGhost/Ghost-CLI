'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');

const migrations = require('../../lib/migrations');

describe('Unit: Migrations', function () {
    describe('ensureSettingsFolder', function () {
        const setupEnv = require('../utils/env');
        const path = require('path');
        const fs = require('fs');

        it('creates settings folder if not existent', function () {
            const env = setupEnv();
            const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);
            const ensureSettingsFolder = migrations[0].task;

            ensureSettingsFolder();
            expect(cwdStub.calledOnce).to.be.true;
            expect(fs.existsSync(path.join(env.dir, 'content/settings'))).to.be.true;

            cwdStub.restore();
            env.cleanup();
        });
    });
});
