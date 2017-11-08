'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const modulePath = '../index';
const Promise = require('bluebird');

const NGINX = require(modulePath);
const testURL = 'http://ghost.dev';
const nginxBase = '/etc/nginx/sites-';
const dir = '/var/www/ghost';

function addStubs(instance) {
    instance.isSupported = () => true;
    instance.ui = {
        log: sinon.stub(),
        listr: sinon.stub(),
        prompt: sinon.stub().resolves(),
        sudo: sinon.stub().resolves()
    };
    instance.restartNginx = sinon.stub().resolves();
    return instance;
}

function proxyNginx(proxyOptions) {
    const Nginx = proxyquire(modulePath, proxyOptions);
    const created = new Nginx();
    return addStubs(created);
}

function _get(key) {
    const keys = {
        url: testURL,
        'server.port': 2368
    };

    return keys[key];
}

describe('Unit: Nginx extension', function () {
    it('inherits from extension', function () {
        const ext = require('../../../lib/extension.js');

        expect(NGINX.prototype instanceof ext).to.be.true;
    });

    describe('setup hook', function () {
        let ext;

        before(function () {
            ext = new NGINX();
        });

        it('Doesn\'t run on local installs', function () {
            const asStub = sinon.stub();
            const cmd = {addStage: asStub};
            ext.setup(cmd, {local: true});

            expect(asStub.called).to.be.false;
        });

        it('Adds nginx and ssl substages', function () {
            const asStub = sinon.stub();
            const cmd = {addStage: asStub};
            ext.setup(cmd, {});

            expect(asStub.calledTwice).to.be.true;
            expect(asStub.getCall(0).args[0]).to.equal('nginx');
            expect(asStub.getCall(1).args[0]).to.equal('ssl');
            expect(asStub.getCall(1).args[2]).to.equal('nginx');
        });
    });

    describe('setupNginx', function () {
        let ext;
        let ctx;
        const task = {skip: sinon.stub()};

        beforeEach(function () {
            ext = new NGINX();
            ext = addStubs(ext);
            ctx = {
                instance: {
                    config: {get: sinon.stub().callsFake(_get)}
                }
            };
        });

        afterEach(function () {
            task.skip.reset();
        });

        it('Checks if nginx is installed & breaks if not', function () {
            ext.isSupported = sinon.stub().returns(false);
            ext.setupNginx(null, null, task);

            expect(ext.isSupported.calledOnce).to.be.true;
            expect(ext.ui.log.calledOnce).to.be.true;
            expect(ext.ui.log.getCall(0).args[0]).to.match(/not installed/);
            expect(task.skip.calledOnce).to.be.true;
        });

        it('Notifies if URL contains a port & breaks', function () {
            const get = sinon.stub().returns(`${testURL}:3000`);
            const log = ext.ui.log;
            ctx.instance.config.get = get;
            ext.setupNginx(null, ctx, task);

            expect(get.calledOnce).to.be.true;
            expect(log.calledOnce).to.be.true;
            expect(log.getCall(0).args[0]).to.match(/contains a port/);
            expect(task.skip.calledOnce).to.be.true;
        });

        // This is 2 tests in one, because checking the proper file name via a test requires
        //  very similar logic to nginx not running setup if the config file already exists
        it('Generates correct filename & breaks if already configured', function () {
            const expectedFile = `${nginxBase}available/ghost.dev.conf`;
            const existsStub = sinon.stub().returns(true);
            const ext = proxyNginx({'fs-extra': {existsSync: existsStub}});
            ext.setupNginx(null, ctx, task);
            const log = ext.ui.log;

            expect(existsStub.calledOnce).to.be.true;
            expect(existsStub.getCall(0).args[0]).to.equal(expectedFile);
            expect(log.calledOnce).to.be.true;
            expect(log.getCall(0).args[0]).to.match(/configuration already found/);
            expect(task.skip.calledOnce).to.be.true;
        });

        it('Generates the proper config', function () {
            const name = 'ghost.dev.conf';
            const lnExp = new RegExp(`(?=^ln -sf)(?=.*available/${name})(?=.*enabled/${name}$)`);
            ctx.instance.dir = dir;
            ctx.instance.template = sinon.stub().resolves();
            const expectedConfig = {
                url: 'ghost.dev',
                webroot: `${dir}/system/nginx-root`,
                location: '/',
                port: 2368
            };
            const loadStub = sinon.stub().returns('nginx config file');
            const templateStub = sinon.stub().returns(loadStub);
            const ext = proxyNginx({
                'fs-extra': {
                    existsSync: () => false,
                    readFileSync: () => 'hello'
                },
                'lodash/template': templateStub
            });
            const sudo = sinon.stub().resolves();
            ext.ui.sudo = sudo;

            return ext.setupNginx(null, ctx, task).then(() => {
                expect(templateStub.calledOnce).to.be.true;
                expect(loadStub.calledOnce).to.be.true;
                expect(loadStub.getCall(0).args[0]).to.deep.equal(expectedConfig);
                expect(sudo.calledOnce).to.be.true;
                expect(sudo.getCall(0).args[0]).to.match(lnExp);
                expect(ext.restartNginx.calledOnce).to.be.true;

                // Testing handling of subdirectory installations

                loadStub.reset();
                ctx.instance.config.get = (key) => {
                    if (key === 'url') {
                        return `${testURL}/a/b/c`;
                    } else {
                        return _get(key);
                    }
                };
                expectedConfig.location = '^~ /a/b/c';

                return ext.setupNginx(null, ctx, task).then(() => {
                    expect(loadStub.calledOnce).to.be.true;
                    expect(loadStub.getCall(0).args[0]).to.deep.equal(expectedConfig);
                });
            });
        });
    });

    describe('setupSSL', function () {
        let stubs;
        let task;
        let ctx;
        let ext;

        beforeEach(function () {
            stubs = {
                es: sinon.stub().returns(false),
                skip: sinon.stub()
            };
            task = {skip: stubs.skip};
            ctx = {instance: {config: {get: _get}}};
            ext = proxyNginx({'fs-extra': {existsSync: stubs.es}});
        });

        it('Breaks if ssl config already exists', function () {
            const sslFile = '/etc/nginx/sites-available/ghost.dev-ssl.conf';
            const existsStub = sinon.stub().returns(true);
            ext = proxyNginx({'fs-extra': {existsSync: existsStub}});
            ext.setupSSL(null, ctx, task);
            const log = ext.ui.log;

            expect(existsStub.calledOnce).to.be.true;
            expect(existsStub.getCall(0).args[0]).to.equal(sslFile);
            expect(log.calledOnce).to.be.true;
            expect(log.getCall(0).args[0]).to.match(/SSL has /);
            expect(stubs.skip.calledOnce).to.be.true;
        });

        it('Errors when email cannot be retrieved', function () {
            ext.setupSSL({}, ctx, task);

            expect(stubs.es.calledOnce).to.be.true;
            expect(ext.ui.log.calledOnce).to.be.true;
            expect(ext.ui.log.getCall(0).args[0]).to.match(/SSL email must be provided/);
            expect(stubs.skip.calledOnce).to.be.true;
        });

        it('Breaks if http config doesn\'t exist (single & multiple)', function () {
            ext.setupSSL({prompt: true}, ctx, task);

            expect(stubs.es.calledTwice).to.be.true;
            expect(ext.ui.log.called).to.be.false;
            expect(stubs.skip.calledOnce).to.be.true;

            // Test w/ singular context
            stubs.es.reset();
            stubs.skip.reset();
            ext.ui.log.reset();
            ctx.single = true;
            ext.setupSSL({prompt: true}, ctx, task);

            expect(stubs.es.calledTwice, '1').to.be.true;
            expect(ext.ui.log.calledOnce, '2').to.be.true;
            expect(ext.ui.log.getCall(0).args[0]).to.match(/Nginx config file/);
            expect(stubs.skip.calledOnce, '4').to.be.true;
        });
    });

    describe('setupSSL > Subtasks', function () {
        let stubs;
        let task;
        let ctx;
        let proxy;
        const fsExp = new RegExp(/-ssl/);

        function getTasks(ext, args) {
            args = args || {};
            args.prompt = true
            ext.setupSSL(args, ctx, task);

            expect(task.skip.called, 'getTasks: task.skip').to.be.false;
            expect(ext.ui.log.called, 'getTasks: ui.log').to.be.false;
            expect(ext.ui.listr.calledOnce, 'getTasks: ui.listr').to.be.true;
            return ext.ui.listr.getCall(0).args[0];
        }

        beforeEach(function () {
            stubs = {
                es: sinon.stub().callsFake(value => !(fsExp).test(value)),
                skip: sinon.stub()
            };
            task = {skip: stubs.skip};
            ctx = {
                instance: {
                    config: {get: _get},
                    dir: dir
                },
                single: true
            };
            proxy = {
                'fs-extra': {
                    existsSync: stubs.es,
                    readFileSync: value => value
                }
            };
        });

        describe('DNS', function () {
            let DNS;

            beforeEach(function () {
                DNS = new Error('DNS_ERROR');
                proxy.dns = {lookup: () => {throw DNS}};
            });

            it('Breaks if DNS fails (Not found & unknown)', function () {
                DNS.code  = 'ENOTFOUND';
                let ctx = {};
                const ext = proxyNginx(proxy);
                const tasks = getTasks(ext);
                const log = ext.ui.log;
                let firstSet = false;

                return tasks[0].task(ctx).then(() => {
                    expect(log.called).to.be.true;
                    expect(log.getCall(0).args[0]).to.match(/domain isn't set up correctly/);
                    expect(ctx.dnsfail).to.be.true;

                    DNS.code = 'PEACHESARETASTY';
                    log.reset();
                    ctx = {};
                    firstSet = true;
                    return tasks[0].task(ctx)
                }).then(() => {
                    expect(false, 'Promise should have rejected').to.be.true
                }).catch((err) => {
                    expect(firstSet, `ENOTFOUND Failed: ${err}`).to.be.true;
                    expect(err).to.exist;
                    expect(err.code).to.equal(DNS.code);
                    expect(log.called).to.be.false;
                    expect(ctx.dnsfail).to.not.exist;
                });
            });

            it('Everything skips when DNS fails', function () {
                stubs.es.callsFake((val) => (val.indexOf('-ssl') < 0 || val.indexOf('acme') >= 0));
                const ctx = {dnsfail: true};
                const ext = proxyNginx(proxy);
                const tasks = getTasks(ext);

                expect(tasks[1].skip(ctx)).to.be.true;
                expect(tasks[2].skip(ctx)).to.be.true;
                expect(tasks[2].skip({})).to.be.true;
                expect(tasks[3].skip(ctx)).to.be.true;
                expect(tasks[4].skip(ctx)).to.be.true;
                expect(tasks[5].skip(ctx)).to.be.true;
                expect(tasks[6].skip(ctx)).to.be.true;
                expect(tasks[7].skip(ctx)).to.be.true;
                ctx.dnsfail = false;
                // @todo: stub fs so this returns false
                // These are FS related validators
                expect(tasks[4].skip(ctx)).to.be.true;
                expect(tasks[5].skip(ctx)).to.be.true;
            });
        });

        describe('Email', function () {
            it('Loads additional config', function () {
                const ext = proxyNginx(proxy);
                let tasks = getTasks(ext, {sslemail: 'ghost.is@pretty.great'});
                const args = {};

                return tasks[1].task().then((email) => {
                    expect(ext.ui.prompt.called, '4').to.be.false;
                    expect(email).to.equal('ghost.is@pretty.great');

                    ext.ui.prompt.callsFake((opts) => {
                        const email = 'ghost.is@pretty.great';
                        const fail = opts.validate('');
                        const pass = opts.validate(email);
                        expect(fail).to.match(/supply an email/);
                        expect(pass).to.be.true;
                        return Promise.resolve({email});
                    });
                    ext.ui.listr.reset();
                    tasks = getTasks(ext, args);
                    return tasks[1].task();
                }).then((otherEmail) => {
                    expect(ext.ui.prompt.called).to.be.true;
                    expect(otherEmail).to.not.exist;
                    expect(args.sslemail).to.equal('ghost.is@pretty.great');
                });
            });
        });

        describe('Install ACME', function () {
            it('Installs acme.sh', function () {
                stubs.exec = sinon.stub();
                proxy.execa = {shell: stubs.exec};
                const ext = proxyNginx(proxy);
                const tasks = getTasks(ext);
                ext.ui.logVerbose = sinon.stub();

                return tasks[2].task().then(() => {
                    expect(ext.ui.logVerbose.calledThrice).to.be.true;
                    expect(ext.ui.sudo.calledTwice).to.be.true;
                    expect(stubs.exec.calledOnce).to.be.true;
                    expect(stubs.exec.getCall(0).args[0]).to.match(/(?=^git clone)(?=.*acme\.sh)/);
                    expect(ext.ui.sudo.getCall(0).args[0]).to.match(/mkdir -p/);
                    expect(ext.ui.sudo.getCall(1).args[0]).to.match(/acme\.sh --install/);
                });
            });

            it('Rejects when acme.sh fails', function () {
                stubs.exec = sinon.stub().throws(new Error('Uh-oh'));
                proxy.execa = {shell: stubs.exec};
                const ext = proxyNginx(proxy);
                ext.ui.logVerbose = sinon.stub();
                const tasks = getTasks(ext);

                return tasks[2].task().then(() => {
                    expect(false, 'Promise should have been rejected').to.be.true;
                }).catch((e) => {
                    // @todo make sure e is a process error
                    expect(e.message).to.equal('Uh-oh');
                });
            });
        });

        describe('Certificate', function () {
            it('Gets an SSL certificate (prod & staging)', function () {
                const expectedSudo = new RegExp('/etc/letsencrypt/acme.sh --issue');
                const ext = proxyNginx(proxy);
                let tasks = getTasks(ext);

                return tasks[3].task().then(() => {
                    expect(ext.ui.sudo.calledOnce).to.be.true;
                    expect(ext.ui.sudo.getCall(0).args[0]).to.match(expectedSudo);

                    ext.ui.sudo = sinon.stub().resolves();
                    ext.ui.log.reset();
                    ext.ui.listr.reset();
                    tasks = getTasks(ext, {sslstaging: true});

                    return tasks[3].task();
                }).then(() => {
                    expect(ext.ui.sudo.calledOnce).to.be.true;
                    expect(ext.ui.sudo.getCall(0).args[0]).to.match(/--issue .{0,} --staging/);
                });
            });

            it('Knows when a certificate already exists', function () {
                const ext = proxyNginx(proxy);
                const acmeError = new Error('Cert exists');
                acmeError.code = 2;
                ext.ui.sudo.rejects(acmeError);
                const tasks = getTasks(ext);

                return tasks[3].task().then((ret) => {
                    expect(ext.ui.sudo.calledOnce).to.be.true;
                    expect(ret).to.not.exist
                });
            });

            it('Knows when domain doesn\'t point to the right place', function () {
                const acmeError = {stderr: 'Verify error:Invalid Response'};
                const ext = proxyNginx(proxy);
                ext.ui.sudo.rejects(acmeError);
                const tasks = getTasks(ext);

                return tasks[3].task().then(() => {
                    expect(false, 'Promise should be rejected').to.be.true;
                }).catch((err) => {
                    expect(ext.ui.sudo.calledOnce).to.be.true;
                    expect(err).to.match(/correct IP address/i);
                });
            });

            it('Gracefully rejects unknown errors', function () {
                const acmeError = new Error('Minions overworked');
                acmeError.stderr = 'Minions overworked';
                const ext = proxyNginx(proxy);
                ext.ui.sudo.rejects(acmeError);
                const tasks = getTasks(ext);

                return tasks[3].task().then(() => {
                    expect(false, 'Promise should be rejected').to.be.true;
                }).catch((err) => {
                    expect(ext.ui.sudo.calledOnce).to.be.true;
                    expect(err.message).to.equal('Minions overworked');
                });
            });
        });

        describe('dhparam', function () {
            beforeEach(function () {
                stubs.exec = sinon.stub().throws(new Error('Uh-oh'));
                proxy.execa = {shell: stubs.exec};
            });

            it('Uses OpenSSL (and skips if already exists)', function () {
                const ext = proxyNginx(proxy);
                const tasks = getTasks(ext);

                return tasks[4].task().then(() => {
                    expect(ext.ui.sudo.calledOnce).to.be.true;
                    expect(ext.ui.sudo.getCall(0).args[0]).to.match(/openssl dhparam/);
                });
            });

            it('Rejects when command fails', function () {
                const ext = proxyNginx(proxy);
                ext.ui.sudo.rejects(new Error('Go ask George'))
                const tasks = getTasks(ext);

                return tasks[4].task().then(() => {
                    expect(false, 'Promise should have rejected').to.be.true;
                }).catch((err) => {
                    expect(ext.ui.sudo.calledOnce).to.be.true;
                    expect(err.message).to.equal('Go ask George');
                });
            });
        });
        describe('Headers', function () {
            beforeEach(function () {
                stubs.wf = sinon.stub().resolves();
                proxy['fs-extra'].writeFile = stubs.wf;
            });

            it('Writes & moves file to proper location', function () {
                const ext = proxyNginx(proxy);
                const tasks = getTasks(ext);
                const expectedSudo = new RegExp(/(?=^mv)(?=.*snippets\/ssl-params\.conf)/);

                return tasks[5].task().then(() => {
                    expect(ext.ui.sudo.calledOnce).to.be.true;
                    expect(ext.ui.sudo.getCall(0).args[0]).to.match(expectedSudo);
                });
            });

            it('Throws an error when moving fails', function () {
                const ext = proxyNginx(proxy);
                ext.ui.sudo.rejects(new Error('Potato'));
                const tasks = getTasks(ext);

                return tasks[5].task().then(() => {
                    expect(false, 'Promise should have been rejected').to.be.true;
                }).catch((err) => {
                    expect(ext.ui.sudo.calledOnce).to.be.true;
                    expect(err.message).to.equal('Potato');
                });
            });
        });
        describe('Config', function () {
            const expectedTemplate = {
                url: 'ghost.dev',
                webroot: '/var/www/ghost/system/nginx-root',
                fullchain: '/etc/letsencrypt/ghost.dev/fullchain.cer',
                privkey: '/etc/letsencrypt/ghost.dev/ghost.dev.key',
                sslparams: '/etc/nginx/snippets/ssl-params.conf',
                location: '/',
                port: 2368
            };
            const expectedSudo = /(?=^ln -s)(?=.*sites-available)(?=.*sites-enabled)/;

            beforeEach(function () {
                stubs.templatify = sinon.stub().returns('nginx ssl config');
                stubs.template = sinon.stub().returns(stubs.templatify);
                ctx.instance.template = () => Promise.resolve();
                proxy['fs-extra'].writeFile = sinon.stub().resolves();
                proxy['lodash/template'] = stubs.template
            });

            it('Provides necessary template data', function () {
                const ext = proxyNginx(proxy);
                const tasks = getTasks(ext);
                return tasks[6].task(ctx).then(() => {
                    expect(stubs.template.calledTwice).to.be.true;
                    expect(stubs.templatify.calledOnce).to.be.true;
                    expect(stubs.templatify.getCall(0).args[0]).to.deep.equal(expectedTemplate);
                    expect(ext.ui.sudo.calledOnce).to.be.true;
                    expect(ext.ui.sudo.getCall(0).args[0]).to.match(expectedSudo);
                });
            });

            it('Templates subdirectories properly', function () {
                ctx.instance.config.get = (key) => key === 'url' ? 'http://ghost.dev/blog' : 2368;
                const ext = proxyNginx(proxy);
                const tasks = getTasks(ext);
                expectedTemplate.location = '^~ /blog';

                return tasks[6].task(ctx).then(() => {
                    expect(stubs.template.calledTwice).to.be.true;
                    expect(stubs.templatify.calledOnce).to.be.true;
                    expect(stubs.templatify.getCall(0).args[0]).to.deep.equal(expectedTemplate);
                });
            });
        });
        describe('Restart', function () {
            it('Restarts Nginx', function () {
                const ext = proxyNginx(proxy);
                const tasks = getTasks(ext);

                return tasks[7].task(ctx).then(() => {
                    expect(ext.restartNginx.calledOnce).to.be.true;
                });
            });
        });
    });

    describe('uninstall hook', function () {
        const instance = {config: {get: () => 'http://ghost.dev'}};
        const testEs = (val) => (new RegExp(/-ssl/)).test(val);
        it('Leaves nginx alone when no config file exists', function () {
            const esStub = sinon.stub().returns(false);
            const ext = proxyNginx({'fs-extra': {existsSync: esStub}});

            return ext.uninstall(instance).then(() => {
                expect(esStub.calledTwice).to.be.true;
                expect(ext.restartNginx.called).to.be.false;
            });
        });

        it('Removes http config', function () {
            const sudoExp = new RegExp(/(available|enabled)\/ghost\.dev\.conf/)
            const esStub = sinon.stub().callsFake((val) => !testEs(val));
            const ext = proxyNginx({'fs-extra': {existsSync: esStub}});

            return ext.uninstall(instance).then(() => {
                expect(ext.ui.sudo.calledTwice).to.be.true;
                expect(ext.ui.sudo.getCall(0).args[0]).to.match(sudoExp);
                expect(ext.ui.sudo.getCall(1).args[0]).to.match(sudoExp);
                expect(ext.restartNginx.calledOnce).to.be.true;
            });
        });

        it('Removes https config', function () {
            const sudoExp = new RegExp(/(available|enabled)\/ghost\.dev-ssl\.conf/)
            const esStub = sinon.stub().callsFake(testEs);
            const ext = proxyNginx({'fs-extra': {existsSync: esStub}});

            return ext.uninstall(instance).then(() => {
                expect(ext.ui.sudo.calledTwice).to.be.true;
                expect(ext.ui.sudo.getCall(0).args[0]).to.match(sudoExp);
                expect(ext.ui.sudo.getCall(1).args[0]).to.match(sudoExp);
                expect(ext.restartNginx.calledOnce).to.be.true;
            });
        });

        it('Handles symlink removal fails smoothly', function () {
            const urlStub = sinon.stub().returns('http://ghost.dev');
            const instance = {config: {get: urlStub}};
            const esStub = sinon.stub().returns(true);
            const NGINX = proxyquire(modulePath, {'fs-extra': {existsSync: esStub}});
            const ext = new NGINX();
            ext.ui = {sudo: sinon.stub().rejects(), log: sinon.stub()};
            ext.restartNginx = sinon.stub();

            return ext.uninstall(instance).then(() => {
                expect(false, 'A rejection should have happened').to.be.true;
            }).catch((error) => {
                sinon.assert.callCount(ext.ui.sudo, 4);
                expect(error.message).to.match(/Nginx config file/);
                expect(ext.restartNginx.calledOnce).to.be.false;
            });
        });
    });

    describe('restartNginx', function () {
        let ext;

        beforeEach(function () {
            ext = new NGINX();
            ext.ui = {sudo: sinon.stub().resolves()}
        })

        it('Soft reloads nginx', function () {
            const sudo = ext.ui.sudo;
            ext.restartNginx();

            expect(sudo.calledOnce).to.be.true;
            expect(sudo.getCall(0).args[0]).to.match(/nginx -s reload/);
        });

        it('Throws an Error when nginx does', function () {
            ext.ui.sudo.rejects('ssl error or something');
            const sudo = ext.ui.sudo;

            return ext.restartNginx().then(function () {
                expect(false, 'An error should have been thrown').to.be.true;
            }).catch(function (err) {
                expect(sudo.calledOnce).to.be.true;
                expect(sudo.getCall(0).args[0]).to.match(/nginx -s reload/);
                // @todo make sure a process error is thrown
                // const expectedError = require('../../../lib/errors');
                expect(err).to.be.ok;
            });
        });
    });

    describe('isSupported', function () {
        it('Calls dpkg', function () {
            const shellStub = sinon.stub().resolves();
            const NGINX = proxyquire(modulePath,{execa: {shellSync: shellStub}});
            const ext = new NGINX();

            ext.isSupported();

            expect(shellStub.calledOnce).to.be.true;
            expect(shellStub.getCall(0).args[0]).to.match(/dpkg -l \| grep nginx/);
        });

        it('Returns false when dpkg fails', function () {
            const shellStub = sinon.stub().throws('uh oh');
            const NGINX = proxyquire(modulePath,{execa: {shellSync: shellStub}});
            const ext = new NGINX();

            const isSupported = ext.isSupported();

            expect(shellStub.calledOnce).to.be.true;
            expect(isSupported).to.be.false;
        });
    });
});
