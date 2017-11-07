'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const proxyQuire = require('proxyquire').noCallThru();
const modulePath = '../index';
const Promise = require('bluebird');

const NGINX = require(modulePath);

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
        let ext;

        before(function () {
            ext = new NGINX();
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
            const getStub = sinon.stub().returns('http://ghost.dev:3000');
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

        // This is 2 tests in one, because checking the proper file name via a test requires
        //  very similar logic to nginx not running setup if the config file already exists
        it('Doesn\'t run if config file exists & generates proper file name', function () {
            const expectedFile = '/etc/nginx/sites-available/ghost.dev.conf';
            const esStub = sinon.stub().returns(true);
            const getStub = sinon.stub().returns('http://ghost.dev');
            const NGINX = proxyQuire(modulePath,{'fs-extra': {existsSync: esStub}});
            const task = {skip: sinon.stub()};
            const ctx = {instance: {config: {get: getStub}}};
            const ext = new NGINX();
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
            const base = '/etc/nginx/sites-';
            const sudo = `ln -sf ${base}available/ghost.dev.conf ${base}enabled/ghost.dev.conf`;
            const getStub = sinon.stub().callsFake((request) => {
                switch (request) {
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
            const templateStub = sinon.stub().returns(templatifyStub);
            const task = {skip: sinon.stub()};
            const NGINX = proxyQuire(modulePath, {
                'fs-extra': {
                    existsSync: esStub,
                    readFileSync: syncStub
                },
                'lodash/template': templateStub
            });
            const ext = new NGINX();
            ext.isSupported = sinon.stub().returns(true);
            ext.ui = {sudo: sinon.stub().resolves()};
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
            const base = '/etc/nginx/sites-';
            const sudo = `ln -sf ${base}available/ghost.dev.conf ${base}enabled/ghost.dev.conf`;
            const getStub = sinon.stub().callsFake((request) => {
                switch (request) {
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
            const templateStub = sinon.stub().returns(templatifyStub);
            const task = {skip: sinon.stub()};
            const NGINX = proxyQuire(modulePath, {
                'fs-extra': {
                    existsSync: esStub,
                    readFileSync: syncStub
                },
                'lodash/template': templateStub
            });
            const ext = new NGINX();
            ext.isSupported = sinon.stub().returns(true);
            ext.ui = {sudo: sinon.stub().resolves()};
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

    describe('setupSSL', function () {
        it('Skips if ssl config already exists', function () {
            const sslFile = '/etc/nginx/sites-available/ghost.dev-ssl.conf';
            const esStub = sinon.stub().returns(true);
            const getStub = sinon.stub().returns('http://ghost.dev');
            const task = {skip: sinon.stub()};
            const ctx = {instance: {config: {get: getStub}}};
            const NGINX = proxyQuire(modulePath, {'fs-extra': {existsSync: esStub}});
            const ext = new NGINX();
            ext.ui = {log: sinon.stub()};

            ext.setupSSL(null, ctx, task);

            expect(getStub.calledOnce).to.be.true;
            expect(esStub.calledOnce).to.be.true;
            expect(esStub.getCall(0).args[0]).to.equal(sslFile);
            expect(ext.ui.log.calledOnce).to.be.true;
            expect(ext.ui.log.getCall(0).args[0]).to.match(/SSL has /);
            expect(task.skip.calledOnce).to.be.true;
        });

        it('Errors when email cannot be retrieved', function () {
            const esStub = sinon.stub().returns(false);
            const getStub = sinon.stub().returns('http://ghost.dev');
            const task = {skip: sinon.stub()};
            const ctx = {instance: {config: {get: getStub}}};
            const NGINX = proxyQuire(modulePath, {'fs-extra': {existsSync: esStub}});
            const ext = new NGINX();
            ext.ui = {log: sinon.stub()};

            ext.setupSSL({}, ctx, task);

            expect(getStub.calledOnce).to.be.true;
            expect(esStub.calledOnce).to.be.true;
            expect(ext.ui.log.calledOnce).to.be.true;
            expect(ext.ui.log.getCall(0).args[0]).to.match(/SSL email must be provided/);
            expect(task.skip.calledOnce).to.be.true;
        });

        it('Skips if http config doesn\'t exist', function () {
            const esStub = sinon.stub().returns(false);
            const getStub = sinon.stub().returns('http://ghost.dev');
            const task = {skip: sinon.stub()};
            const ctx = {instance: {config: {get: getStub}}, single: true};
            const NGINX = proxyQuire(modulePath, {'fs-extra': {existsSync: esStub}});
            const ext = new NGINX();
            ext.ui = {log: sinon.stub()};

            ext.setupSSL({prompt: true}, ctx, task);

            expect(getStub.calledOnce).to.be.true;
            expect(esStub.calledTwice).to.be.true;
            expect(ext.ui.log.calledOnce).to.be.true;
            expect(ext.ui.log.getCall(0).args[0]).to.match(/Nginx config file/);
            expect(task.skip.calledOnce).to.be.true;
        });

        describe('Subtask > DNS', function () {
            it('Cancels if DNS fails (not found)', function () {
                const DNS = new Error('failed');
                DNS.code  = 'ENOTFOUND';
                const esStub = sinon.stub().callsFake(value => !(new RegExp(/-ssl/)).test(value));
                const dnsStub = sinon.stub().throws(DNS);
                const task = {skip: sinon.stub()};
                const ctx = {
                    instance: {
                        config: {get: () => 'http://ghost.dev'},
                        dir: '/var/www/ghost'
                    },
                    single: true
                };
                const NGINX = proxyQuire(modulePath, {
                    'fs-extra': {
                        existsSync: esStub,
                        readFileSync: value => value
                    },
                    dns: {lookup: dnsStub}
                });
                const ext = new NGINX();
                ext.ui = {
                    log: sinon.stub(),
                    listr: sinon.stub()
                };

                ext.setupSSL({prompt: true}, ctx, task);

                expect(task.skip.called).to.be.false;
                expect(ext.ui.log.called).to.be.false;
                expect(ext.ui.listr.calledOnce).to.be.true;

                const tasks = ext.ui.listr.getCall(0).args[0];
                const taskContext = {};

                return tasks[0].task(taskContext).then(() => {
                    expect(ext.ui.log.called).to.be.true;
                    expect(ext.ui.log.getCall(0).args[0]).to.match(/domain isn't set up correctly/);
                    expect(taskContext.dnsfail).to.exist;
                    expect(taskContext.dnsfail).to.be.true;
                });
            });

            it('Cancels if DNS fails (generic)', function () {
                const DNS = new Error('failed');
                DNS.code  = 'PEACHESARETASTY';
                const esStub = sinon.stub().callsFake(value => !(new RegExp(/-ssl/)).test(value));
                const dnsStub = sinon.stub().throws(DNS);
                const task = {skip: sinon.stub()};
                const ctx = {
                    instance: {
                        config: {get: () => 'http://ghost.dev'},
                        dir: '/var/www/ghost'
                    },
                    single: true
                };
                const NGINX = proxyQuire(modulePath, {
                    'fs-extra': {
                        existsSync: esStub,
                        readFileSync: value => value
                    },
                    dns: {lookup: dnsStub}
                });
                const ext = new NGINX();
                ext.ui = {
                    log: sinon.stub(),
                    listr: sinon.stub()
                };

                ext.setupSSL({prompt: true}, ctx, task);

                expect(task.skip.called).to.be.false;
                expect(ext.ui.log.called).to.be.false;
                expect(ext.ui.listr.calledOnce).to.be.true;

                const tasks = ext.ui.listr.getCall(0).args[0];
                const taskContext = {};

                return tasks[0].task(taskContext).then(() => {
                    expect(false, 'Promise should have been rejected').to.be.true;
                }).catch((err) => {
                    expect(err).to.exist;
                    expect(err.code).to.equal('PEACHESARETASTY');
                    expect(ext.ui.log.called).to.be.false;
                    expect(taskContext.dnsfail).to.not.exist;
                });
            });

            it('If DNS fails, nothing else runs', function () {
                const esStub = sinon.stub().callsFake(value => value.indexOf('-ssl') < 0 || value.indexOf('acme') >= 0);
                const dnsStub = sinon.stub();
                const task = {skip: sinon.stub()};
                const ctx = {
                    instance: {
                        config: {get: () => 'http://ghost.dev'},
                        dir: '/var/www/ghost'
                    },
                    single: true
                };
                const NGINX = proxyQuire(modulePath, {
                    'fs-extra': {
                        existsSync: esStub,
                        readFileSync: value => value
                    },
                    dns: {lookup: dnsStub}
                });
                const ext = new NGINX();
                ext.ui = {
                    log: sinon.stub(),
                    listr: sinon.stub(),
                    prompt: sinon.stub().resolves()
                };

                ext.setupSSL({prompt: true}, ctx, task);

                expect(task.skip.called).to.be.false;
                expect(ext.ui.log.called).to.be.false;
                expect(ext.ui.listr.calledOnce).to.be.true;

                const tasks = ext.ui.listr.getCall(0).args[0];
                const cntx = {dnsfail: true};

                expect(tasks[1].skip(cntx)).to.be.true;
                expect(tasks[2].skip(cntx)).to.be.true;
                expect(tasks[2].skip({})).to.be.true;
                expect(tasks[3].skip(cntx)).to.be.true;
                expect(tasks[4].skip(cntx)).to.be.true;
                expect(tasks[5].skip(cntx)).to.be.true;
            });
        });
        describe('Subtask > Email', function () {
            it('Loads additional config (sslemail exists)', function () {
                const esStub = sinon.stub().callsFake(value => !(new RegExp(/-ssl/)).test(value));
                const dnsStub = sinon.stub();
                const task = {skip: sinon.stub()};
                const ctx = {
                    instance: {
                        config: {get: () => 'http://ghost.dev'},
                        dir: '/var/www/ghost'
                    },
                    single: true
                };
                const NGINX = proxyQuire(modulePath, {
                    'fs-extra': {
                        existsSync: esStub,
                        readFileSync: value => value
                    },
                    dns: {lookup: dnsStub}
                });
                const ext = new NGINX();
                ext.ui = {
                    log: sinon.stub(),
                    listr: sinon.stub(),
                    prompt: sinon.stub().resolves()
                };

                ext.setupSSL({prompt: true, sslemail: 'ghost.is@pretty.great'}, ctx, task);

                expect(task.skip.called).to.be.false;
                expect(ext.ui.log.called).to.be.false;
                expect(ext.ui.listr.calledOnce).to.be.true;

                const tasks = ext.ui.listr.getCall(0).args[0];

                return tasks[1].task().then((email) => {
                    expect(ext.ui.prompt.called).to.be.false;
                    expect(email).to.equal('ghost.is@pretty.great');
                });
            });

            it('Loads additional config (prompts)', function () {
                const esStub = sinon.stub().callsFake(value => !(new RegExp(/-ssl/)).test(value));
                const task = {skip: sinon.stub()};
                const ctx = {
                    instance: {
                        config: {get: () => 'http://ghost.dev'},
                        dir: '/var/www/ghost'
                    },
                    single: true
                };
                const NGINX = proxyQuire(modulePath, {
                    'fs-extra': {
                        existsSync: esStub,
                        readFileSync: value => value
                    }
                });
                const ext = new NGINX();
                ext.ui = {
                    log: sinon.stub(),
                    listr: sinon.stub(),
                    prompt: sinon.stub().callsFake((opts) => {
                        const email = 'ghost.is@pretty.great';
                        const fail = opts.validate('');
                        const pass = opts.validate(email);
                        expect(fail).to.match(/supply an email/);
                        expect(pass).to.be.true;
                        return Promise.resolve({email});
                    })
                };

                const argv = {prompt: true}
                ext.setupSSL(argv, ctx, task);

                expect(task.skip.called).to.be.false;
                expect(ext.ui.log.called).to.be.false;
                expect(ext.ui.listr.calledOnce).to.be.true;

                const tasks = ext.ui.listr.getCall(0).args[0];

                return tasks[1].task().then((email) => {
                    expect(ext.ui.prompt.called).to.be.true;
                    expect(email).to.not.exist;
                    expect(argv.sslemail).to.equal('ghost.is@pretty.great');
                });
            });
        });
        describe('Subtask > Install ACME', function () {
            it('Installs acme.sh', function () {
                const esStub = sinon.stub().callsFake(value => !(new RegExp(/-ssl/)).test(value));
                const execaStub = sinon.stub();
                const task = {skip: sinon.stub()};
                const ctx = {
                    instance: {
                        config: {get: () => 'http://ghost.dev'},
                        dir: '/var/www/ghost'
                    },
                    single: true
                };
                const NGINX = proxyQuire(modulePath, {
                    'fs-extra': {
                        existsSync: esStub,
                        readFileSync: value => value
                    },
                    execa: {shell: execaStub}
                });
                const ext = new NGINX();
                ext.ui = {
                    log: sinon.stub(),
                    listr: sinon.stub(),
                    logVerbose: sinon.stub(),
                    sudo: sinon.stub().resolves()
                };

                const argv = {prompt: true}
                ext.setupSSL(argv, ctx, task);

                expect(task.skip.called).to.be.false;
                expect(ext.ui.log.called).to.be.false;
                expect(ext.ui.listr.calledOnce).to.be.true;

                const tasks = ext.ui.listr.getCall(0).args[0];

                return tasks[2].task().then(() => {
                    expect(ext.ui.logVerbose.calledThrice).to.be.true;
                    expect(ext.ui.sudo.calledTwice).to.be.true;
                    expect(execaStub.calledOnce).to.be.true;
                    expect(execaStub.getCall(0).args[0]).to.match(/git clone .{0,}acme\.sh/);
                    expect(ext.ui.sudo.getCall(0).args[0]).to.match(/mkdir -p/);
                    expect(ext.ui.sudo.getCall(1).args[0]).to.match(/acme\.sh --install/);
                });
            });

            it('Rejects when acme.sh fails', function () {
                const esStub = sinon.stub().callsFake(value => !(new RegExp(/-ssl/)).test(value));
                const execaStub = sinon.stub().throws(new Error('Uh-oh'));
                const task = {skip: sinon.stub()};
                const ctx = {
                    instance: {
                        config: {get: () => 'http://ghost.dev'},
                        dir: '/var/www/ghost'
                    },
                    single: true
                };
                const NGINX = proxyQuire(modulePath, {
                    'fs-extra': {
                        existsSync: esStub,
                        readFileSync: value => value
                    },
                    execa: {shell: execaStub}
                });
                const ext = new NGINX();
                ext.ui = {
                    log: sinon.stub(),
                    listr: sinon.stub(),
                    logVerbose: sinon.stub(),
                    sudo: sinon.stub().resolves()
                };

                const argv = {prompt: true}
                ext.setupSSL(argv, ctx, task);

                expect(task.skip.called).to.be.false;
                expect(ext.ui.log.called).to.be.false;
                expect(ext.ui.listr.calledOnce).to.be.true;

                const tasks = ext.ui.listr.getCall(0).args[0];

                return tasks[2].task().then(() => {
                    expect(false, 'Promise should have been rejected').to.be.true;
                }).catch((e) => {
                    // @todo make sure e is a process error
                    expect(e.message).to.equal('Uh-oh');
                });
            });
        });
        describe('Subtask > Certificate', function () {
            it('Gets an SSL certificate', function () {
                const esStub = sinon.stub().callsFake(value => !(new RegExp(/-ssl/)).test(value));
                const execaStub = sinon.stub().throws(new Error('Uh-oh'));
                const task = {skip: sinon.stub()};
                const ctx = {
                    instance: {
                        config: {get: () => 'http://ghost.dev'},
                        dir: '/var/www/ghost'
                    },
                    single: true
                };
                const NGINX = proxyQuire(modulePath, {
                    'fs-extra': {
                        existsSync: esStub,
                        readFileSync: value => value
                    },
                    execa: {shell: execaStub}
                });
                const ext = new NGINX();
                ext.ui = {
                    log: sinon.stub(),
                    listr: sinon.stub(),
                    sudo: sinon.stub().resolves()
                };

                const argv = {prompt: true}
                ext.setupSSL(argv, ctx, task);

                expect(task.skip.called).to.be.false;
                expect(ext.ui.log.called).to.be.false;
                expect(ext.ui.listr.calledOnce).to.be.true;

                const tasks = ext.ui.listr.getCall(0).args[0];

                return tasks[3].task().then(() => {
                    expect(ext.ui.sudo.calledOnce).to.be.true;
                    expect(ext.ui.sudo.getCall(0).args[0]).to.match(/\/etc\/letsencrypt\/acme\.sh --issue/);
                });
            });

            it('Gets an SSL certificate (staging)', function () {
                const esStub = sinon.stub().callsFake(value => !(new RegExp(/-ssl/)).test(value));
                const execaStub = sinon.stub().throws(new Error('Uh-oh'));
                const task = {skip: sinon.stub()};
                const ctx = {
                    instance: {
                        config: {get: () => 'http://ghost.dev'},
                        dir: '/var/www/ghost'
                    },
                    single: true
                };
                const NGINX = proxyQuire(modulePath, {
                    'fs-extra': {
                        existsSync: esStub,
                        readFileSync: value => value
                    },
                    execa: {shell: execaStub}
                });
                const ext = new NGINX();
                ext.ui = {
                    log: sinon.stub(),
                    listr: sinon.stub(),
                    sudo: sinon.stub().resolves()
                };

                const argv = {prompt: true, sslstaging: true}
                ext.setupSSL(argv, ctx, task);

                expect(task.skip.called).to.be.false;
                expect(ext.ui.log.called).to.be.false;
                expect(ext.ui.listr.calledOnce).to.be.true;

                const tasks = ext.ui.listr.getCall(0).args[0];

                return tasks[3].task().then(() => {
                    expect(ext.ui.sudo.calledOnce).to.be.true;
                    expect(ext.ui.sudo.getCall(0).args[0]).to.match(/\/etc\/letsencrypt\/acme\.sh --issue .{0,} --staging/);
                });
            });

            it('Knows when a certificate already exists', function () {
                const esStub = sinon.stub().callsFake(value => !(new RegExp(/-ssl/)).test(value));
                const task = {skip: sinon.stub()};
                const ctx = {
                    instance: {
                        config: {get: () => 'http://ghost.dev'},
                        dir: '/var/www/ghost'
                    },
                    single: true
                };
                const NGINX = proxyQuire(modulePath, {
                    'fs-extra': {
                        existsSync: esStub,
                        readFileSync: value => value
                    }
                });
                const ext = new NGINX();
                const acmeError = new Error('Cert exists');
                acmeError.code = 2;
                ext.ui = {
                    log: sinon.stub(),
                    listr: sinon.stub(),
                    sudo: sinon.stub().rejects(acmeError)
                };

                const argv = {prompt: true};
                ext.setupSSL(argv, ctx, task);

                expect(task.skip.called).to.be.false;
                expect(ext.ui.log.called).to.be.false;
                expect(ext.ui.listr.calledOnce).to.be.true;

                const tasks = ext.ui.listr.getCall(0).args[0];

                return tasks[3].task().then((ret) => {
                    expect(ext.ui.sudo.calledOnce).to.be.true;
                    expect(ret).to.not.exist
                });
            });

            it('Knows when domain doesn\'t point to the right place', function () {
                const esStub = sinon.stub().callsFake(value => !(new RegExp(/-ssl/)).test(value));
                const task = {skip: sinon.stub()};
                const ctx = {
                    instance: {
                        config: {get: () => 'http://ghost.dev'},
                        dir: '/var/www/ghost'
                    },
                    single: true
                };
                const NGINX = proxyQuire(modulePath, {
                    'fs-extra': {
                        existsSync: esStub,
                        readFileSync: value => value
                    }
                });
                const ext = new NGINX();
                const acmeError = {stderr: 'Verify error:Invalid Response'};
                ext.ui = {
                    log: sinon.stub(),
                    listr: sinon.stub(),
                    sudo: sinon.stub().rejects(acmeError)
                };

                const argv = {prompt: true};
                ext.setupSSL(argv, ctx, task);

                expect(task.skip.called).to.be.false;
                expect(ext.ui.log.called).to.be.false;
                expect(ext.ui.listr.calledOnce).to.be.true;

                const tasks = ext.ui.listr.getCall(0).args[0];

                return tasks[3].task().then(() => {
                    expect(false, 'Promise should be rejected').to.be.true;
                }).catch((err) => {
                    expect(ext.ui.sudo.calledOnce).to.be.true;
                    expect(err).to.match(/correct IP address/i);
                });
            });

            it('Gracefully rejects unknown errors', function () {
                const esStub = sinon.stub().callsFake(value => !(new RegExp(/-ssl/)).test(value));
                const task = {skip: sinon.stub()};
                const ctx = {
                    instance: {
                        config: {get: () => 'http://ghost.dev'},
                        dir: '/var/www/ghost'
                    },
                    single: true
                };
                const NGINX = proxyQuire(modulePath, {
                    'fs-extra': {
                        existsSync: esStub,
                        readFileSync: value => value
                    }
                });
                const ext = new NGINX();
                const acmeError = new Error('Minions overworked');
                acmeError.stderr = 'Minions overworked';
                ext.ui = {
                    log: sinon.stub(),
                    listr: sinon.stub(),
                    sudo: sinon.stub().rejects(acmeError)
                };

                const argv = {prompt: true};
                ext.setupSSL(argv, ctx, task);

                expect(task.skip.called).to.be.false;
                expect(ext.ui.log.called).to.be.false;
                expect(ext.ui.listr.calledOnce).to.be.true;

                const tasks = ext.ui.listr.getCall(0).args[0];

                return tasks[3].task().then(() => {
                    expect(false, 'Promise should be rejected').to.be.true;
                }).catch((err) => {
                    expect(ext.ui.sudo.calledOnce).to.be.true;
                    expect(err.message).to.equal('Minions overworked');
                });
            });
        });
        describe('Subtask > dhparam', function () {
            it('Uses OpenSSL (and skips if already exists)', function () {
                const esStub = sinon.stub().callsFake(value => !(new RegExp(/(-ssl|\.pem)/)).test(value));
                const execaStub = sinon.stub().throws(new Error('Uh-oh'));
                const task = {skip: sinon.stub()};
                const ctx = {
                    instance: {
                        config: {get: () => 'http://ghost.dev'},
                        dir: '/var/www/ghost'
                    },
                    single: true
                };
                const NGINX = proxyQuire(modulePath, {
                    'fs-extra': {
                        existsSync: esStub,
                        readFileSync: value => value
                    },
                    execa: {shell: execaStub}
                });
                const ext = new NGINX();
                ext.ui = {
                    log: sinon.stub(),
                    listr: sinon.stub(),
                    sudo: sinon.stub().resolves()
                };

                const argv = {prompt: true}
                ext.setupSSL(argv, ctx, task);

                expect(task.skip.called).to.be.false;
                expect(ext.ui.log.called).to.be.false;
                expect(ext.ui.listr.calledOnce).to.be.true;

                const tasks = ext.ui.listr.getCall(0).args[0];

                expect(tasks[4].skip({dnsfail: false})).to.be.false;

                return tasks[4].task().then(() => {
                    expect(ext.ui.sudo.calledOnce).to.be.true;
                    expect(ext.ui.sudo.getCall(0).args[0]).to.match(/openssl dhparam/);
                });
            });

            it('Rejects when command fails', function () {
                const esStub = sinon.stub().callsFake(value => !(new RegExp(/(-ssl|\.pem)/)).test(value));
                const execaStub = sinon.stub().throws(new Error('Uh-oh'));
                const task = {skip: sinon.stub()};
                const ctx = {
                    instance: {
                        config: {get: () => 'http://ghost.dev'},
                        dir: '/var/www/ghost'
                    },
                    single: true
                };
                const NGINX = proxyQuire(modulePath, {
                    'fs-extra': {
                        existsSync: esStub,
                        readFileSync: value => value
                    },
                    execa: {shell: execaStub}
                });
                const ext = new NGINX();
                ext.ui = {
                    log: sinon.stub(),
                    listr: sinon.stub(),
                    sudo: sinon.stub().rejects(new Error('Go ask George'))
                };

                const argv = {prompt: true}
                ext.setupSSL(argv, ctx, task);

                expect(task.skip.called).to.be.false;
                expect(ext.ui.log.called).to.be.false;
                expect(ext.ui.listr.calledOnce).to.be.true;

                const tasks = ext.ui.listr.getCall(0).args[0];

                expect(tasks[4].skip({dnsfail: false})).to.be.false;

                return tasks[4].task().then(() => {
                    expect(false, 'Promise should have rejected').to.be.true;
                }).catch((err) => {
                    expect(ext.ui.sudo.calledOnce).to.be.true;
                    expect(err.message).to.equal('Go ask George');
                });
            });
        });
    });

    describe('uninstall hook', function () {
        it('Leaves nginx alone when no config file exists', function () {
            const urlStub = sinon.stub().returns('http://ghost.dev');
            const instance = {config: {get: urlStub}};
            const esStub = sinon.stub().returns(false);
            const NGINX = proxyQuire(modulePath, {'fs-extra': {existsSync: esStub}});
            const ext = new NGINX();
            ext.ui = {sudo: sinon.stub().resolves(), log: sinon.stub()};
            ext.restartNginx = sinon.stub();

            return ext.uninstall(instance).then(() => {
                expect(esStub.calledTwice).to.be.true;
                expect(ext.restartNginx.called).to.be.false;
            });
        });

        it('Removes http config', function () {
            const urlStub = sinon.stub().returns('http://ghost.dev');
            const sudoExp = new RegExp(/(available|enabled)\/ghost\.dev\.conf/)
            const instance = {config: {get: urlStub}};
            const esStub = sinon.stub().callsFake((file) => !(new RegExp(/-ssl/)).test(file));
            const NGINX = proxyQuire(modulePath, {'fs-extra': {existsSync: esStub}});
            const ext = new NGINX();
            ext.ui = {sudo: sinon.stub().resolves(), log: sinon.stub()};
            ext.restartNginx = sinon.stub();

            return ext.uninstall(instance).then(() => {
                expect(ext.ui.sudo.calledTwice).to.be.true;
                expect(ext.ui.sudo.getCall(0).args[0]).to.match(sudoExp);
                expect(ext.ui.sudo.getCall(1).args[0]).to.match(sudoExp);
                expect(ext.restartNginx.calledOnce).to.be.true;
            });
        });

        it('Removes https config', function () {
            const urlStub = sinon.stub().returns('http://ghost.dev');
            const sudoExp = new RegExp(/(available|enabled)\/ghost\.dev-ssl\.conf/)
            const instance = {config: {get: urlStub}};
            const esStub = sinon.stub().callsFake((file) => (new RegExp(/-ssl/)).test(file));
            const NGINX = proxyQuire(modulePath, {'fs-extra': {existsSync: esStub}});
            const ext = new NGINX();
            ext.ui = {sudo: sinon.stub().resolves(), log: sinon.stub()};
            ext.restartNginx = sinon.stub();

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
            const NGINX = proxyQuire(modulePath, {'fs-extra': {existsSync: esStub}});
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
        })

        it('Soft reloads nginx', function () {
            const sudo = sinon.stub().resolves();
            ext.ui = {sudo: sudo};

            ext.restartNginx();

            expect(sudo.calledOnce).to.be.true;
            expect(sudo.getCall(0).args[0]).to.match(/nginx -s reload/);
        });

        it('Throws an Error when nginx does', function () {
            const sudo = sinon.stub().rejects('ssl error or something');
            ext.ui = {sudo: sudo};

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
            const NGINX = proxyQuire(modulePath,{execa: {shellSync: shellStub}});
            const ext = new NGINX();

            ext.isSupported();

            expect(shellStub.calledOnce).to.be.true;
            expect(shellStub.getCall(0).args[0]).to.match(/dpkg -l \| grep nginx/);
        });

        it('Returns false when dpkg fails', function () {
            const shellStub = sinon.stub().throws('uh oh');
            const NGINX = proxyQuire(modulePath,{execa: {shellSync: shellStub}});
            const ext = new NGINX();

            const isSupported = ext.isSupported();

            expect(shellStub.calledOnce).to.be.true;
            expect(isSupported).to.be.false;
        });
    });
});
