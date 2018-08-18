'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const modulePath = '../../../lib/utils/find-extensions';

const localExtensions = [
    'mysql',
    'nginx',
    'systemd'
];

describe('Unit: Utils > find-extensions', function () {
    let findExtensions, findStub, existsStub;

    beforeEach(() => {
        findStub = sinon.stub().returns([
            {
                pkg: {name: 'test'}
            }, {
                pkg: {
                    'ghost-cli': {name: 'rest'}
                }
            }, {
                pkg: {}
            }
        ]);

        existsStub = sinon.stub();

        findExtensions = proxyquire(modulePath, {
            'find-plugins': findStub,
            'global-modules': '.',
            fs: {existsSync: existsStub}
        });
    });

    it('calls find-plugins with proper args', function () {
        existsStub.returns(true);
        findExtensions();
        expect(findStub.calledOnce).to.be.true;
        const args = findStub.args[0][0];

        const expected = {
            keyword: 'ghost-cli-extension',
            configName: 'ghost-cli',
            scanAllDirs: true,
            dir: '.',
            sort: true
        };

        const extensions = args.include.map(ext => ext.split('extensions/')[1]);
        delete args.include;
        expect(extensions).to.deep.equal(localExtensions);
        expect(args).to.deep.equal(expected);
    });

    it('uses process.cwd() when global modules dir doesn\'t exist', function () {
        existsStub.returns(false);
        findExtensions();
        expect(findStub.calledOnce).to.be.true;
        const args = findStub.args[0][0];

        const expected = {
            keyword: 'ghost-cli-extension',
            configName: 'ghost-cli',
            scanAllDirs: true,
            dir: process.cwd(),
            sort: true
        };

        const extensions = args.include.map(ext => ext.split('extensions/')[1]);
        delete args.include;
        expect(extensions).to.deep.equal(localExtensions);
        expect(args).to.deep.equal(expected);
    });

    it('generates proper extension names', function () {
        existsStub.returns(true);
        const names = findExtensions().map(ext => ext.name);
        const expectedNames = ['test', 'rest', undefined];
        expect(names).to.deep.equal(expectedNames);
    });
});
