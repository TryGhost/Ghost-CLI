'use strict';
const path = require('path');
const expect = require('chai').expect;
const proxyquire = require('proxyquire').noCallThru();

const errors = require('../../lib/errors');

const modulePath = '../../lib/index';

describe('Unit: Index', function () {
    let requireMain;

    beforeEach(function () {
        requireMain = require.main.filename;
    });

    afterEach(function () {
        require.main.filename = requireMain;
    });

    it('requires local files if require.main is not a ghost executable', function () {
        require.main.filename = '/usr/lib/node_modules/mocha/bin/mocha';
        const rootPath = '/usr/lib/node_modules/mocha/lib/index.js';
        const rootPathObj = {this: 'is', not: 'what', should: 'be', required: true};

        const cli = proxyquire(modulePath, {
            [rootPath]: rootPathObj
        });

        expect(cli).to.not.deep.equal(rootPathObj);
        expect(cli.errors).to.deep.equal(errors);
    });

    it('requires local files if require.main is the main ghost-cli instance', function () {
        const currentRoot = path.join(__dirname, '../../');
        require.main.filename = path.join(currentRoot, 'bin/ghost');
        const rootPath = path.join(currentRoot, 'lib/index.js');
        const rootPathObj = {this: 'is', not: 'what', should: 'be', required: true};

        const cli = proxyquire(modulePath, {
            [rootPath]: rootPathObj
        });

        expect(cli).to.not.deep.equal(rootPathObj);
        expect(cli.errors).to.deep.equal(errors);
    });

    it('requires rootPath if require.main is a different ghost-cli instance', function () {
        require.main.filename = '/usr/lib/node_modules/ghost-cli/bin/ghost';
        const rootPath = '/usr/lib/node_modules/ghost-cli/lib/index.js';
        const rootPathObj = {this: 'is', what: 'should', be: 'required'};

        const cli = proxyquire(modulePath, {
            [rootPath]: rootPathObj
        });

        expect(cli).to.deep.equal(rootPathObj);
    });
});
