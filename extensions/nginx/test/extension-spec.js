'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const proxyQuire = require('proxyquire').noCallThru();
const modulePath = '../index';

const nginx = require(modulePath);

describe('Unit: Nginx extension', function () {
    it('inherits from extension', function () {
        const ext = require('../../../lib/extension.js');

        expect(nginx.prototype instanceof ext).to.be.true;
    });

    describe('setup hook', function () {
        let ext;

        before(function () {
            ext = new nginx();
        });

        it('Doesn\'t run on local installs', function () {
            const command = {addStage: sinon.stub()};
            ext.setup(command, {local: true});
            expect(command.addStage.called).to.be.false;
        });

        it('Adds nginx and ssl substages', function () {
            const asStub = sinon.stub();
            const command = {
                addStage: asStub
            };
            ext.setup(command,{});

            expect(asStub.calledTwice).to.be.true;
            expect(asStub.getCall(0).args[0]).to.equal('nginx');
            expect(asStub.getCall(1).args[0]).to.equal('ssl');
            expect(asStub.getCall(1).args[2]).to.equal('nginx');
        });
    });

    describe('setupNginx', function () {
        let ext, task;

        before(function () {
            ext = new nginx();
        });

        it('Checks if nginx is installed', function () {
            const task = {skip: sinon.stub()};
            ext.isSupported = sinon.stub().returns(false);
            ext.ui = {log: sinon.stub()};

            ext.setupNginx(null, null, task);

            expect(ext.isSupported.calledOnce).to.be.true;
            expect(ext.ui.log.calledOnce).to.be.true;
            expect(ext.ui.log.getCall(0).args[0]).to.match(/not installed/);
            expect(task.skip.calledOnce).to.be.true;
        });

        it('Doesn\'t run if URL contains a port', function () {
            const getStub = sinon.stub().callsFake((request) => {
                if(request == 'url')
                    return 'http://ghost.dev:3000';
                else throw new Error('Unknown key');
            });
            const ctx = {instance: {config: {get: getStub}}};
            const task = {skip: sinon.stub()};
            ext.isSupported = sinon.stub().returns(true);
            ext.ui = {log: sinon.stub()};

            ext.setupNginx(null, ctx, task);

            expect(getStub.calledOnce).to.be.true;
            expect(ext.ui.log.calledOnce).to.be.true;
            expect(ext.ui.log.getCall(0).args[0]).to.match(/contains a port/);
            expect(task.skip.calledOnce).to.be.true;
        });

        // This is 2 tests in one, because checking the proper file name via test requires
        //  very similar logic to nginx not running setup if the config file already exists
        it('Doesn\'t run if config file exists & generates proper file name', function () {
            const expectedFile = '/etc/nginx/sites-available/ghost.dev.conf';
            const esStub = sinon.stub().returns(true);
            const getStub = sinon.stub().callsFake((request) => {
                if(request == 'url')
                    return 'http://ghost.dev';
                else throw new Error('Unknown key');
            });
            const nginx = proxyQuire(modulePath,{'fs-extra': {existsSync: esStub}});
            const task = {skip: sinon.stub()};
            const ctx = {instance: {config: {get: getStub}}};
            const ext = new nginx();
            ext.isSupported = sinon.stub().returns(true);
            ext.ui = {log: sinon.stub()};

            ext.setupNginx(null, ctx, task);

            expect(ext.isSupported.calledOnce).to.be.true;
            expect(getStub.calledOnce).to.be.true;
            expect(esStub.calledOnce).to.be.true;
            expect(esStub.getCall(0).args[0]).to.equal(expectedFile);
            expect(ext.ui.log.calledOnce).to.be.true;
            expect(ext.ui.log.getCall(0).args[0]).to.match(/configuration already found/);
            expect(task.skip.calledOnce).to.be.true;
        });

        it('Generates the proper config (root)', function () {
            const sudo = `ln -sf /etc/nginx/sites-available/ghost.dev.conf /etc/nginx/sites-enabled/ghost.dev.conf`
            const getStub = sinon.stub().callsFake((request) => {
                switch(request) {
                    case 'url':
                        return 'http://ghost.dev';
                    case 'server.port':
                        return 2368;
                    default:
                        throw new Error(`Unknown key '${request}'`);
                }
            });
            const ctx = {
                instance: {
                    dir: '/var/www/ghost',
                    config: {get: getStub},
                    template: sinon.stub().resolves()
                }
            };
            const expectedConfig = {
                url: 'ghost.dev',
                webroot: '/var/www/ghost/system/nginx-root',
                location: '/',
                port: 2368
            };
            const esStub = sinon.stub().returns(false);
            const syncStub = sinon.stub().returns('hello!');
            const templatifyStub = sinon.stub().returns('nginx config file');
            const templateStub = sinon.stub().callsFake(() => templatifyStub);
            const task = {skip: sinon.stub()};
            const nginx = proxyQuire(modulePath, {
                'fs-extra': {
                    existsSync: esStub,
                    readFileSync: syncStub
                },
                'lodash/template': templateStub
            });
            const ext = new nginx();
            ext.isSupported = sinon.stub().returns(true);
            ext.ui = {sudo:sinon.stub().resolves()};
            ext.restartNginx = sinon.stub();

            return ext.setupNginx(null, ctx, task).then(() => {
                expect(ext.isSupported.calledOnce, 'isSupported called').to.be.true;
                expect(esStub.calledOnce, 'fs.existsSync called').to.be.true;
                expect(templateStub.calledOnce, 'loadash template create called').to.be.true;
                expect(templatifyStub.calledOnce, 'lodash template load called').to.be.true;
                expect(templatifyStub.getCall(0).args[0]).to.deep.equal(expectedConfig);
                expect(ext.ui.sudo.calledOnce, 'sudo called').to.be.true;
                expect(ext.ui.sudo.getCall(0).args[0]).to.equal(sudo);
                expect(ext.restartNginx.calledOnce).to.be.true;
            }).catch((e) => {
                console.log(e);
                expect(false,'Should not have rejected').to.be.true;
            });
        });

        // @todo: should this be merged w/ the previous test?
        it('Generates the proper config (subdir)', function () {
            const sudo = `ln -sf /etc/nginx/sites-available/ghost.dev.conf /etc/nginx/sites-enabled/ghost.dev.conf`
            const getStub = sinon.stub().callsFake((request) => {
                switch(request) {
                    case 'url':
                        return 'http://ghost.dev/a/b/c/d';
                    case 'server.port':
                        return 2368;
                    default:
                        throw new Error(`Unknown key '${request}'`);
                }
            });
            const ctx = {
                instance: {
                    dir: '/var/www/ghost',
                    config: {get: getStub},
                    template: sinon.stub().resolves()
                }
            };
            const expectedConfig = {
                url: 'ghost.dev',
                webroot: '/var/www/ghost/system/nginx-root',
                location: '^~ /a/b/c/d',
                port: 2368
            };
            const esStub = sinon.stub().returns(false);
            const syncStub = sinon.stub().returns('hello!');
            const templatifyStub = sinon.stub().returns('nginx config file');
            const templateStub = sinon.stub().callsFake(() => templatifyStub);
            const task = {skip: sinon.stub()};
            const nginx = proxyQuire(modulePath, {
                'fs-extra': {
                    existsSync: esStub,
                    readFileSync: syncStub
                },
                'lodash/template': templateStub
            });
            const ext = new nginx();
            ext.isSupported = sinon.stub().returns(true);
            ext.ui = {sudo:sinon.stub().resolves()};
            ext.restartNginx = sinon.stub();

            return ext.setupNginx(null, ctx, task).then(() => {
                expect(ext.isSupported.calledOnce).to.be.true;
                expect(esStub.calledOnce).to.be.true;
                expect(templateStub.calledOnce).to.be.true;
                expect(templatifyStub.calledOnce).to.be.true;
                expect(templatifyStub.getCall(0).args[0]).to.deep.equal(expectedConfig);
                expect(ext.ui.sudo.calledOnce).to.be.true;
                expect(ext.ui.sudo.getCall(0).args[0]).to.equal(sudo);
                expect(ext.restartNginx.calledOnce).to.be.true;
            });
        });
    });
});
