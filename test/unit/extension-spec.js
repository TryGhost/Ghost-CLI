'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const tmp = require('tmp');
const path = require('path');
const fs = require('fs-extra');
const proxyquire = require('proxyquire').noCallThru();

const modulePath = '../../lib/extension';

describe('Unit: Extension', function () {
    describe('processManagers getter', function () {
        it('returns nothing if process managers package section does not exist', function () {
            const Extension = require(modulePath);
            const extensionInstance = new Extension({}, {}, {}, '/some/dir');

            expect(extensionInstance.processManagers).to.deep.equal({});
        });

        it('returns nothing if ghost-cli section defined, but no process-manager section', function () {
            const Extension = require(modulePath);
            const extensionInstance = new Extension({}, {}, {'ghost-cli': {}}, '/some/dir');

            expect(extensionInstance.processManagers).to.deep.equal({});
        });

        it('returns process managers mapped by name to filepath', function () {
            const Extension = require(modulePath);
            const extensionInstance = new Extension({}, {}, {
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

    describe('template', function () {
        const Extension = require(modulePath);

        it('immediately calls _generateTemplate if ui.allowPrompt is false', function () {
            const promptStub = sinon.stub().resolves();
            const testExtension = new Extension({
                prompt: promptStub,
                allowPrompt: false,
                verbose: true
            }, {}, {}, '');
            const generateStub = sinon.stub(testExtension, '_generateTemplate').resolves(true);

            return testExtension.template({}, 'some contents', 'a file', 'file.txt', '/some/dir').then((result) => {
                expect(result).to.be.true;
                expect(promptStub.called).to.be.false;
                expect(generateStub.calledOnce).to.be.true;
                expect(generateStub.args[0][1]).to.equal('some contents');
            });
        });

        it('immediately calls _generateTemplate if ui.verbose is false', function () {
            const promptStub = sinon.stub().resolves();
            const testExtension = new Extension({
                prompt: promptStub,
                allowPrompt: true,
                verbose: false
            }, {}, {}, '');
            const generateStub = sinon.stub(testExtension, '_generateTemplate').resolves(true);

            return testExtension.template({}, 'some contents', 'a file', 'file.txt', '/some/dir').then((result) => {
                expect(result).to.be.true;
                expect(promptStub.called).to.be.false;
                expect(generateStub.calledOnce).to.be.true;
                expect(generateStub.args[0][1]).to.equal('some contents');
            });
        });

        it('immediately calls _generateTemplate if ui.allowPrompt and ui.verbose is false', function () {
            const promptStub = sinon.stub().resolves();
            const testExtension = new Extension({
                prompt: promptStub,
                allowPrompt: true,
                verbose: false
            }, {}, {}, '');
            const generateStub = sinon.stub(testExtension, '_generateTemplate').resolves(true);

            return testExtension.template({}, 'some contents', 'a file', 'file.txt', '/some/dir').then((result) => {
                expect(result).to.be.true;
                expect(promptStub.called).to.be.false;
                expect(generateStub.calledOnce).to.be.true;
                expect(generateStub.args[0][1]).to.equal('some contents');
            });
        });

        it('generates template if the choice is to continue (with --verbose)', function () {
            const promptStub = sinon.stub().resolves({choice: 'continue'});
            const testExtension = new Extension({prompt: promptStub, allowPrompt: true, verbose: true}, {}, {}, '');
            const generateStub = sinon.stub(testExtension, '_generateTemplate').resolves(true);

            return testExtension.template({}, 'some contents', 'a file', 'file.txt', '/some/dir').then((result) => {
                expect(result).to.be.true;
                expect(generateStub.calledOnce).to.be.true;
                expect(promptStub.calledOnce).to.be.true;
                expect(generateStub.args[0]).to.deep.equal([{}, 'some contents', 'a file', 'file.txt', '/some/dir']);
            });
        });

        it('logs and calls template method again if choice is view (with --verbose)', function () {
            const promptStub = sinon.stub();
            promptStub.onCall(0).resolves({choice: 'view'});
            promptStub.onCall(1).resolves({choice: 'continue'});
            const logStub = sinon.stub();
            const testExtension = new Extension({log: logStub, prompt: promptStub, allowPrompt: true, verbose: true}, {}, {}, '');
            const generateStub = sinon.stub(testExtension, '_generateTemplate').resolves(true);

            return testExtension.template({}, 'some contents', 'a file', 'file.txt', '/some/dir').then((result) => {
                expect(result).to.be.true;
                expect(promptStub.calledTwice).to.be.true;
                expect(logStub.calledOnce).to.be.true;
                expect(logStub.args[0][0]).to.equal('some contents');
                expect(generateStub.calledOnce).to.be.true;
                expect(generateStub.args[0]).to.deep.equal([{}, 'some contents', 'a file', 'file.txt', '/some/dir']);
            });
        });

        it('opens editor and generates template with contents if choice is edit (with --verbose)', function () {
            const promptStub = sinon.stub();
            promptStub.onCall(0).resolves({choice: 'edit'});
            promptStub.onCall(1).resolves({contents: 'some edited contents'});
            const testExtension = new Extension({prompt: promptStub, allowPrompt: true, verbose: true}, {}, {}, '');
            const generateStub = sinon.stub(testExtension, '_generateTemplate').resolves(true);

            return testExtension.template({}, 'some contents', 'a file', 'file.txt', '/some/dir').then((result) => {
                expect(result).to.be.true;
                expect(promptStub.calledTwice).to.be.true;
                expect(generateStub.calledOnce).to.be.true;
                expect(generateStub.args[0][1]).to.equal('some edited contents');
            });
        });
    });

    describe('_generateTemplate', function () {
        const Extension = require(modulePath);

        it('writes out template to correct directory but doesn\'t link if no dir is passed', function () {
            const dir = tmp.dirSync({unsafeCleanup: true}).name;
            const successStub = sinon.stub();
            const testExtension = new Extension({success: successStub}, {}, {}, '');

            return testExtension._generateTemplate({dir}, 'some contents', 'a file', 'file.txt').then((result) => {
                expect(result).to.be.true;
                const fpath = path.join(dir, 'system', 'files', 'file.txt');
                expect(fs.existsSync(fpath)).to.be.true;
                expect(fs.readFileSync(fpath, 'utf8')).to.equal('some contents');
                expect(successStub.calledOnce).to.be.true;
            });
        });

        it('writes out template and links it correctly if dir is passed', function () {
            const dir = tmp.dirSync({unsafeCleanup: true}).name;
            const sudoStub = sinon.stub().resolves();
            const successStub = sinon.stub();
            const testExtension = new Extension({sudo: sudoStub, success: successStub}, {}, '');

            return testExtension._generateTemplate({dir}, 'some contents', 'a file', 'file.txt', '/another/dir').then((result) => {
                expect(result).to.be.true;
                const fpath = path.join(dir, 'system', 'files', 'file.txt');
                expect(fs.existsSync(fpath)).to.be.true;
                expect(fs.readFileSync(fpath, 'utf8')).to.equal('some contents');
                expect(sudoStub.calledOnce).to.be.true;
                expect(sudoStub.args[0][0]).to.equal(`ln -sf ${fpath} /another/dir/file.txt`);
                expect(successStub.calledOnce).to.be.true;
                expect(successStub.firstCall.args[0]).to.match(/^Creating a file file at/);
            });
        });
    });

    describe('getInstance', function () {
        it('returns instance of base class if no main class is defined', function () {
            const Extension = require(modulePath);

            const extensionInstance = Extension.getInstance({uiInstance: true}, {systemInstance: true}, {
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

        it('returns nothing if main file does not exist', function () {
            const existsSyncStub = sinon.stub().returns(false);
            const Extension = proxyquire(modulePath, {
                'fs-extra': {existsSync: existsSyncStub}
            });
            const logStub = sinon.stub();

            const extensionInstance = Extension.getInstance({log: logStub}, {}, {
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
            const existsSyncStub = sinon.stub().returns(true);
            const Extension = proxyquire(modulePath, {
                'fs-extra': {existsSync: existsSyncStub},
                '/some/dir/index': {}
            });
            const logStub = sinon.stub();

            const extensionInstance = Extension.getInstance({log: logStub}, {}, {
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
            const existsSyncStub = sinon.stub().returns(true);
            const Extension = proxyquire(modulePath, {
                'fs-extra': {existsSync: existsSyncStub},
                '/some/dir/index': class NotAnExtension {}
            });
            const logStub = sinon.stub();

            const extensionInstance = Extension.getInstance({log: logStub}, {}, {
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

        it('returns an extension subclass if everything works out', function () {
            const path = require('path');
            const Extension = require(modulePath);
            const testExtPath = '../fixtures/TestExtension';
            const TestExt = require(testExtPath);

            const extensionInstance = Extension.getInstance({}, {}, {
                pkg: {
                    name: 'ghost-cli-test-extension',
                    main: 'index.js'
                },
                dir: path.resolve(__dirname, testExtPath)
            });

            expect(extensionInstance).to.be.ok;
            expect(extensionInstance instanceof TestExt).to.be.true;
        });
    });
});
