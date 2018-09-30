'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const modulePath = '../index';
const Promise = require('bluebird');
const {errors, Extension} = require('../../../lib');
const configStub = require('../../../test/utils/config-stub');

// Proxied things
const fs = require('fs-extra');
const execa = require('execa');
const migrations = require('../migrations');

const Nginx = require(modulePath);
const testURL = 'http://ghost.dev';
// const nginxBase = '/etc/nginx/sites-';
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

describe('Unit: Extensions > Nginx', function () {
    afterEach(() => {
        sinon.restore();
    });

    it('inherits from extension', function () {
        expect(Nginx.prototype instanceof Extension).to.be.true;
    });

    it('migrations hook', function () {
        const inst = new Nginx({}, {}, {}, '/some/dir');
        const migrateStub = sinon.stub(migrations, 'migrateSSL');
        const result = inst.migrations();

        expect(result).to.have.length(1);
        const [task] = result;

        expect(task.before).to.equal('1.2.0');
        expect(task.title).to.equal('Migrating SSL certs');

        task.task();
        expect(migrateStub.calledOnce).to.be.true;

        inst.system.platform = {linux: false};
        const exists = sinon.stub(fs, 'existsSync').returns(false);
        expect(task.skip()).to.be.true;
        expect(exists.called).to.be.false;

        inst.system.platform = {linux: true};
        expect(task.skip()).to.be.true;
        expect(exists.calledOnce).to.be.true;

        inst.system.platform = {linux: true};
        exists.returns(true);
        expect(task.skip()).to.be.false;
        expect(exists.calledTwice).to.be.true;
    });

    describe('setup hook', function () {
        function tasks(i) {
            const inst = new Nginx({}, {}, {}, '/some/dir');
            const result = inst.setup();
            expect(result).to.have.length(2);
            return {inst, task: result[i]};
        }

        it('nginx', function () {
            const {task, inst} = tasks(0);
            const nginxStub = sinon.stub(inst, 'setupNginx');

            // Check nginx
            expect(task.id).to.equal('nginx');
            expect(task.name).to.equal('Nginx');
            expect(task.enabled({argv: {local: false}})).to.be.true;
            expect(task.enabled({argv: {local: true}})).to.be.false;

            task.task('some', 'args');
            expect(nginxStub.calledOnce).to.be.true;
            expect(nginxStub.calledWithExactly('some', 'args')).to.be.true;

            const supportedStub = sinon.stub(inst, 'isSupported').returns(false);
            const exists = sinon.stub(fs, 'existsSync').returns(true);
            const config = configStub();
            const ctx = {instance: {config}};

            function reset() {
                exists.resetHistory();
                config.get.reset();
            }

            expect(task.skip(ctx)).to.contain('Nginx is not installed.');
            expect(config.get.called).to.be.false;
            expect(supportedStub.calledOnce).to.be.true;
            expect(exists.called).to.be.false;

            reset();
            supportedStub.returns(true);
            config.get.returns('http://localhost:2368');
            expect(task.skip(ctx)).to.contain('Your url contains a port.');
            expect(config.get.called).to.be.true;
            expect(exists.called).to.be.false;

            reset();
            config.get.returns('https://ghost.dev');
            expect(task.skip(ctx)).to.contain('Nginx configuration already found for this url.');
            expect(config.get.called).to.be.true;
            expect(exists.calledOnce).to.be.true;

            reset();
            config.get.returns('https://ghost.dev');
            exists.returns(false);
            expect(task.skip(ctx)).to.be.false;
            expect(config.get.called).to.be.true;
            expect(exists.calledOnce).to.be.true;
        });

        it('ssl', function () {
            const ip = sinon.stub();
            const {task, inst} = tasks(1);
            const stub = sinon.stub(inst, 'setupSSL');

            // Check SSL
            expect(task.id).to.equal('ssl');
            expect(task.name).to.equal('SSL');
            expect(task.enabled({argv: {local: false}})).to.be.true;
            expect(task.enabled({argv: {local: true}})).to.be.false;

            task.task('some', 'args');
            expect(stub.calledOnce).to.be.true;
            expect(stub.calledWithExactly('some', 'args')).to.be.true;

            const isSkipped = sinon.stub().returns(false);
            const hasFailed = sinon.stub().returns(false);
            const exists = sinon.stub(fs, 'existsSync');
            const config = configStub();

            const nginx = {isSkipped, hasFailed};
            const context = {tasks: {nginx}, instance: {config}};

            isSkipped.returns(true);
            expect(task.skip(context)).to.contain('Nginx setup task was skipped');

            isSkipped.returns(false);
            hasFailed.returns(true);
            expect(task.skip(context)).to.contain('Nginx setup task failed');

            hasFailed.returns(false);
            ip.returns(true);
            config.get.returns('http://127.0.0.1');
            expect(task.skip(context)).to.contain('SSL certs cannot be generated for IP addresses');
            expect(exists.called).to.be.false;

            ip.returns(false);
            exists.returns(true);
            config.get.returns('http://ghost.dev');
            expect(task.skip(context)).to.contain('SSL has already been set up');
            expect(exists.calledOnce).to.be.true;

            exists.reset();
            exists.returns(false);
            expect(task.skip(Object.assign({argv: {prompt: false}}, context))).to.contain('SSL email must be provided');
            expect(exists.calledOnce).to.be.true;

            const argv = {prompt: true, sslemail: 'test@ghost.org'};

            exists.resetHistory();
            expect(task.skip(Object.assign({argv, single: true}, context))).to.contain('Nginx config file does not exist');
            expect(exists.calledTwice).to.be.true;

            exists.resetHistory();
            expect(task.skip(Object.assign({argv, single: false}, context))).to.be.true;
            expect(exists.calledTwice).to.be.true;

            exists.reset();
            exists.onFirstCall().returns(false);
            exists.onSecondCall().returns(true);
            expect(task.skip(Object.assign({argv}, context))).to.be.false;
            expect(exists.calledTwice).to.be.true;
        });
    });

    describe('setupNginx', function () {
        const config = configStub();
        config.get.callsFake(_get);

        it('Generates the proper config', function () {
            const name = 'ghost.dev.conf';
            const lnExp = new RegExp(`(?=^ln -sf)(?=.*available/${name})(?=.*enabled/${name}$)`);
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
            ext.template = sinon.stub().resolves();
            const sudo = sinon.stub().resolves();
            ext.ui.sudo = sudo;

            return ext.setupNginx({instance: {config, dir}}).then(() => {
                expect(templateStub.calledOnce).to.be.true;
                expect(loadStub.calledOnce).to.be.true;
                expect(loadStub.args[0][0]).to.deep.equal(expectedConfig);
                expect(sudo.calledOnce).to.be.true;
                expect(sudo.args[0][0]).to.match(lnExp);
                expect(ext.restartNginx.calledOnce).to.be.true;

                // Testing handling of subdirectory installations

                loadStub.reset();
                config.get.withArgs('url').returns(`${testURL}/a/b/c`);
                expectedConfig.location = '^~ /a/b/c';

                return ext.setupNginx({instance: {config, dir}}).then(() => {
                    expect(loadStub.calledOnce).to.be.true;
                    expect(loadStub.args[0][0]).to.deep.equal(expectedConfig);
                });
            });
        });

        it('passes the error if it\'s already a CliError', function () {
            const name = 'ghost.dev.conf';
            const lnExp = new RegExp(`(?=^ln -sf)(?=.*available/${name})(?=.*enabled/${name}$)`);
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
            ext.template = sinon.stub().resolves();
            ext.ui.sudo = sudo;
            ext.restartNginx = sinon.stub().rejects(new errors.CliError('Did not restart'));

            return ext.setupNginx({instance: {config, dir}}).then(() => {
                expect(false, 'Promise should have rejected').to.be.true;
            }).catch((error) => {
                expect(error).to.exist;
                expect(error).to.be.an.instanceof(errors.CliError);
                expect(error.message).to.be.equal('Did not restart');
                expect(templateStub.calledOnce).to.be.true;
                expect(loadStub.calledOnce).to.be.true;
                expect(sudo.calledOnce).to.be.true;
                expect(sudo.args[0][0]).to.match(lnExp);
                expect(ext.restartNginx.calledOnce).to.be.true;
            });
        });

        it('returns a ProcessError when symlink command fails', function () {
            const name = 'ghost.dev.conf';
            const lnExp = new RegExp(`(?=^ln -sf)(?=.*available/${name})(?=.*enabled/${name}$)`);
            const loadStub = sinon.stub().returns('nginx config file');
            const templateStub = sinon.stub().returns(loadStub);
            const ext = proxyNginx({
                'fs-extra': {
                    existsSync: () => false,
                    readFileSync: () => 'hello'
                },
                'lodash/template': templateStub
            });
            const sudo = sinon.stub().rejects({stderr: 'oops'});
            ext.template = sinon.stub().resolves();
            ext.ui.sudo = sudo;

            return ext.setupNginx({instance: {config, dir}}).then(() => {
                expect(false, 'Promise should have rejected').to.be.true;
            }).catch((error) => {
                expect(error).to.exist;
                expect(error).to.be.an.instanceof(errors.ProcessError);
                expect(error.options.stderr).to.be.equal('oops');
                expect(templateStub.calledOnce).to.be.true;
                expect(loadStub.calledOnce).to.be.true;
                expect(sudo.calledOnce).to.be.true;
                expect(sudo.args[0][0]).to.match(lnExp);
            });
        });
    });

    describe('setupSSL', function () {
        let stubs;
        let ctx;
        let proxy;
        const fsExp = new RegExp(/-ssl/);

        function getTasks(ext, argv = {}) {
            ext.setupSSL(Object.assign({argv}, ctx));

            expect(ext.ui.log.called, 'getTasks: ui.log').to.be.false;
            expect(ext.ui.listr.calledOnce, 'getTasks: ui.listr').to.be.true;
            return ext.ui.listr.args[0][0];
        }

        beforeEach(function () {
            stubs = {
                es: sinon.stub().callsFake(value => !(fsExp).test(value))
            };
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
                proxy.dns = {lookup: () => {
                    throw DNS;
                }};
            });

            it('Breaks if DNS fails (Not found & unknown)', function () {
                DNS.code = 'ENOTFOUND';
                let ctx = {};
                const ext = proxyNginx(proxy);
                const tasks = getTasks(ext);
                const log = ext.ui.log;
                let firstSet = false;

                return tasks[0].task().then(() => {
                    expect(true, 'task should have errored').to.be.false;
                }).catch((error) => {
                    expect(error).to.be.an.instanceof(errors.CliError);
                    expect(error.message).to.contain('your domain isn\'t set up correctly');

                    DNS.code = 'PEACHESARETASTY';
                    firstSet = true;
                    return tasks[0].task(ctx);
                }).then(() => {
                    expect(false, 'Promise should have rejected').to.be.true;
                }).catch((err) => {
                    expect(firstSet, `ENOTFOUND Failed: ${err}`).to.be.true;
                    expect(err).to.exist;
                    expect(err.options.message).to.match(/Error trying to lookup DNS for 'ghost.dev'/);
                    expect(err.options.err.code).to.equal(DNS.code);
                    expect(log.called).to.be.false;
                    expect(ctx.dnsfail).to.not.exist;
                });
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

        describe('acme', function () {
            it('runs acme install task', function () {
                const installStub = sinon.stub().resolves();
                const ext = proxyNginx(Object.assign(proxy, {
                    './acme': {install: installStub}
                }));
                const tasks = getTasks(ext, {});
                const taskObject = {installTestTask: true};

                return tasks[2].task(null, taskObject).then(() => {
                    expect(installStub.calledOnce).to.be.true;
                    expect(installStub.calledWithExactly(ext.ui, taskObject)).to.be.true;
                });
            });

            it('runs acme generate task', function () {
                const generateStub = sinon.stub().resolves();
                const ext = proxyNginx(Object.assign(proxy, {
                    './acme': {generate: generateStub}
                }));
                const tasks = getTasks(ext, {sslemail: 'test@example.com', sslstaging: true});

                return tasks[3].task().then(() => {
                    expect(generateStub.calledOnce).to.be.true;
                    expect(generateStub.calledWithExactly(
                        ext.ui,
                        'ghost.dev',
                        '/var/www/ghost/system/nginx-root',
                        'test@example.com',
                        true
                    )).to.be.true;
                });
            });
        });

        describe('dhparam', function () {
            beforeEach(function () {
                stubs.exec = sinon.stub().throws(new Error('Uh-oh'));
                proxy.execa = {shell: stubs.exec};
            });

            it('Uses OpenSSL (and skips if already exists)', function () {
                proxy['fs-extra'].existsSync = () => true;
                const ext = proxyNginx(proxy);
                const tasks = getTasks(ext);

                expect(tasks[4].skip()).to.be.true;

                return tasks[4].task().then(() => {
                    expect(ext.ui.sudo.calledOnce).to.be.true;
                    expect(ext.ui.sudo.args[0][0]).to.match(/openssl dhparam/);
                });
            });

            it('Rejects when command fails', function () {
                proxy['fs-extra'].existsSync = () => false;
                const ext = proxyNginx(proxy);
                ext.ui.sudo.rejects(new Error('Go ask George'));
                const tasks = getTasks(ext);

                expect(tasks[4].skip()).to.be.false;
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
                proxy['fs-extra'].existsSync = () => true;
                const ext = proxyNginx(proxy);
                const tasks = getTasks(ext);
                const expectedSudo = new RegExp(/(?=^mv)(?=.*snippets\/ssl-params\.conf)/);

                expect(tasks[5].skip()).to.be.true;
                return tasks[5].task().then(() => {
                    expect(ext.ui.sudo.calledOnce).to.be.true;
                    expect(ext.ui.sudo.args[0][0]).to.match(expectedSudo);
                });
            });

            it('Throws an error when moving fails', function () {
                proxy['fs-extra'].existsSync = () => false;
                const ext = proxyNginx(proxy);
                ext.ui.sudo.rejects(new Error('Potato'));
                const tasks = getTasks(ext);

                expect(tasks[5].skip()).to.be.false;
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
                proxy['fs-extra'].writeFile = sinon.stub().resolves();
                proxy['lodash/template'] = stubs.template;
            });

            it('Provides necessary template data', function () {
                const ext = proxyNginx(proxy);
                const tasks = getTasks(ext);
                ext.template = sinon.stub().resolves();
                return tasks[6].task(ctx).then(() => {
                    expect(stubs.template.calledTwice).to.be.true;
                    expect(stubs.templatify.calledOnce).to.be.true;
                    expect(stubs.templatify.args[0][0]).to.deep.equal(expectedTemplate);
                    expect(ext.ui.sudo.calledOnce).to.be.true;
                    expect(ext.ui.sudo.args[0][0]).to.match(expectedSudo);
                });
            });

            it('Templates subdirectories properly', function () {
                // eslint-disable-next-line arrow-body-style
                ctx.instance.config.get = (key) => {
                    return key === 'url' ? 'http://ghost.dev/blog' : 2368;
                };
                const ext = proxyNginx(proxy);
                const tasks = getTasks(ext);
                ext.template = sinon.stub().resolves();
                expectedTemplate.location = '^~ /blog';

                return tasks[6].task(ctx).then(() => {
                    expect(stubs.template.calledTwice).to.be.true;
                    expect(stubs.templatify.calledOnce).to.be.true;
                    expect(stubs.templatify.args[0][0]).to.deep.equal(expectedTemplate);
                });
            });

            it('rejects with error if configuration fails', function () {
                const ext = proxyNginx(proxy);
                const tasks = getTasks(ext);
                const sudo = sinon.stub().rejects({stderr: 'oh no!'});
                ext.template = sinon.stub().resolves();
                ext.ui.sudo = sudo;

                return tasks[6].task(ctx).then(() => {
                    expect(false, 'Promise should have been rejected').to.be.true;
                }).catch((err) => {
                    expect(stubs.template.calledTwice).to.be.true;
                    expect(stubs.templatify.calledOnce).to.be.true;
                    expect(ext.ui.sudo.calledOnce).to.be.true;
                    expect(err.options.stderr).to.equal('oh no!');
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
        const testEs = val => (new RegExp(/-ssl/)).test(val);

        function stub() {
            const ui = {sudo: sinon.stub(), log: sinon.stub()};
            const exists = sinon.stub(fs, 'existsSync');
            const inst = new Nginx(ui, {}, {}, '/some/dir');
            const restartNginx = sinon.stub(inst, 'restartNginx');

            return {inst, exists, restartNginx, ui};
        }

        it('returns if no url exists in config', function () {
            const config = {get: () => undefined};
            const {exists, inst, restartNginx} = stub();

            return inst.uninstall({config}).then(() => {
                expect(exists.called).to.be.false;
                expect(restartNginx.called).to.be.false;
            });
        });

        it('Leaves nginx alone when no config file exists', function () {
            const {exists, inst, restartNginx} = stub();
            exists.returns(false);

            return inst.uninstall(instance).then(() => {
                expect(exists.calledTwice).to.be.true;
                expect(restartNginx.called).to.be.false;
            });
        });

        it('Removes http config', function () {
            const sudoExp = new RegExp(/(available|enabled)\/ghost\.dev\.conf/);
            const {exists, inst, restartNginx, ui} = stub();
            exists.callsFake(val => !testEs(val));

            return inst.uninstall(instance).then(() => {
                expect(ui.sudo.calledTwice).to.be.true;
                expect(ui.sudo.args[0][0]).to.match(sudoExp);
                expect(ui.sudo.args[1][0]).to.match(sudoExp);
                expect(restartNginx.calledOnce).to.be.true;
            });
        });

        it('Removes https config', function () {
            const sudoExp = new RegExp(/(available|enabled)\/ghost\.dev-ssl\.conf/);
            const {exists, inst, restartNginx, ui} = stub();
            exists.callsFake(testEs);

            return inst.uninstall(instance).then(() => {
                expect(ui.sudo.calledTwice).to.be.true;
                expect(ui.sudo.args[0][0]).to.match(sudoExp);
                expect(ui.sudo.args[1][0]).to.match(sudoExp);
                expect(restartNginx.calledOnce).to.be.true;
            });
        });

        it('Handles symlink removal fails smoothly', function () {
            const {exists, inst, restartNginx, ui} = stub();
            exists.returns(true);
            ui.sudo.rejects();

            return inst.uninstall(instance).then(() => {
                expect(false, 'A rejection should have happened').to.be.true;
            }).catch((error) => {
                expect(ui.sudo.callCount).to.equal(4);
                expect(error).to.be.an.instanceof(errors.CliError);
                expect(error.message).to.match(/Nginx config file/);
                expect(restartNginx.calledOnce).to.be.false;
            });
        });
    });

    describe('restartNginx', function () {
        const sudo = sinon.stub();
        const inst = new Nginx({sudo}, {}, {}, '/some/dir');

        afterEach(() => sudo.reset());

        it('Soft reloads nginx', function () {
            sudo.resolves();

            return inst.restartNginx().then(() => {
                expect(sudo.calledOnce).to.be.true;
                expect(sudo.calledWithExactly('nginx -s reload')).to.be.true;
            });
        });

        it('throws an error when nginx does', function () {
            const err = new Error('ssl error');
            sudo.rejects(err);

            return inst.restartNginx().then(() => {
                expect(false, 'An error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(sudo.calledOnce).to.be.true;
                expect(sudo.calledWithExactly('nginx -s reload')).to.be.true;
                expect(error).to.be.an.instanceof(errors.CliError);
                expect(error.message).to.equal('Failed to restart Nginx.');
            });
        });
    });

    it('isSupported fn', function () {
        const shell = sinon.stub(execa, 'shellSync');
        const inst = new Nginx({}, {}, {}, '/some/dir');

        expect(inst.isSupported()).to.be.true;
        expect(shell.calledOnce).to.be.true;

        shell.reset();
        shell.throws(new Error());
        expect(inst.isSupported()).to.be.false;
        expect(shell.calledOnce).to.be.true;
    });
});
