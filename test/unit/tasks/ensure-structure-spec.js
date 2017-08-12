'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const setupEnv = require('../../utils/env');
const fs = require('fs');
const path = require('path');

const ensureStructure = require('../../../lib/tasks/ensure-structure');

describe('Unit: Tasks > ensure-structure', function () {
    const env = setupEnv();
    const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);

    ensureStructure();
    expect(cwdStub.calledOnce).to.be.true;

    const expectedFiles = [
        'versions',
        'content/apps',
        'content/themes',
        'content/data',
        'content/images',
        'content/logs'
    ];

    expectedFiles.forEach((file) => {
        expect(fs.existsSync(path.join(env.dir, file))).to.be.true;
    });

    cwdStub.restore();
    env.cleanup();
});
