'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const path = require('path');

const modulePath = '../../lib/extension';

describe('Unit: Extension', function () {
    describe('processManagers getter', function () {
        it('returns nothing if process managers package section does not exist', function () {
            let Extension = require(modulePath);
            let extensionInstance = new Extension({}, {}, {}, '/some/dir');

            expect(extensionInstance.processManagers).to.deep.equal({});
        });

        it('returns nothing if ghost-cli section defined, but no process-manager section', function () {
            let Extension = require(modulePath);
            let extensionInstance = new Extension({}, {}, {'ghost-cli': {}}, '/some/dir');

            expect(extensionInstance.processManagers).to.deep.equal({});
        });

        it('returns process managers mapped by name to filepath', function () {
            let Extension = require(modulePath);
            let extensionInstance = new Extension({}, {}, {
                'ghost-cli': {
                    'process-managers': {
                        testa: './testa',
                        testb: './testb'
                    }
                }
            }, '/some/extension/dir');

            expect(extensionInstance.processManagers).to.deep.equal({
                testa: '/some/extension/dir/testa',
                testb: '/some/extension/dir/testb'
            });
        });
    });

    describe('getInstance', function () {
        it('returns instance of base class if no main class is defined', function () {
            let Extension = require(modulePath);

            let extensionInstance = Extension.getInstance({uiInstance: true}, {systemInstance: true}, {
                pkg: {
                    name: 'ghost-cli-test-extension'
                },
                dir: '/some/dir'
            });

            expect(extensionInstance).to.be.an.instanceof(Extension);
            expect(extensionInstance.ui).to.deep.equal({uiInstance: true});
            expect(extensionInstance.system).to.deep.equal({systemInstance: true});
            expect(extensionInstance.pkg).to.deep.equal({
                name: 'ghost-cli-test-extension'
            });
            expect(extensionInstance.dir).to.equal('/some/dir');
        });
    });

    it('returns nothing if main file does not exist', function () {
        let existsSyncStub = sinon.stub().returns(false);
        let Extension = proxyquire(modulePath, {
            'fs-extra': {existsSync: existsSyncStub}
        });
        let logStub = sinon.stub();

        let extensionInstance = Extension.getInstance({log: logStub}, {}, {
            pkg: {
                name: 'ghost-cli-test-extension',
                main: 'index.js'
            },
            dir: '/some/dir'
        });

        expect(extensionInstance).to.not.be.ok;
        expect(existsSyncStub.calledOnce).to.be.true;
        expect(existsSyncStub.calledWithExactly('/some/dir/index.js')).to.be.true;
        expect(logStub.calledOnce).to.be.true;
        expect(logStub.args[0][0]).to.match(/no such file exists/);
    });

    it('returns nothing if main file exists but exports nothing', function () {
        let existsSyncStub = sinon.stub().returns(true);
        let Extension = proxyquire(modulePath, {
            'fs-extra': {existsSync: existsSyncStub},
            '/some/dir/index': {}
        });
        let logStub = sinon.stub();

        let extensionInstance = Extension.getInstance({log: logStub}, {}, {
            pkg: {
                name: 'ghost-cli-test-extension',
                main: 'index.js'
            },
            dir: '/some/dir'
        });

        expect(extensionInstance).to.not.be.ok;
        expect(existsSyncStub.calledOnce).to.be.true;
        expect(existsSyncStub.calledWithExactly('/some/dir/index.js')).to.be.true;
        expect(logStub.calledOnce).to.be.true;
        expect(logStub.args[0][0]).to.match(/not a valid Extension subclass/);
    });

    it('returns nothing if main file exists but is not an extension subclass', function () {
        let existsSyncStub = sinon.stub().returns(true);
        let Extension = proxyquire(modulePath, {
            'fs-extra': {existsSync: existsSyncStub},
            '/some/dir/index': class NotAnExtension {}
        });
        let logStub = sinon.stub();

        let extensionInstance = Extension.getInstance({log: logStub}, {}, {
            pkg: {
                name: 'ghost-cli-test-extension',
                main: 'index.js'
            },
            dir: '/some/dir'
        });

        expect(extensionInstance).to.not.be.ok;
        expect(existsSyncStub.calledOnce).to.be.true;
        expect(existsSyncStub.calledWithExactly('/some/dir/index.js')).to.be.true;
        expect(logStub.calledOnce).to.be.true;
        expect(logStub.args[0][0]).to.match(/not a valid Extension subclass/);
    });
});
