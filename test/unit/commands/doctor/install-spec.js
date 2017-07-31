'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const stripAnsi = require('strip-ansi');
const proxyquire = require('proxyquire').noCallThru();

const modulePath = '../../../../lib/commands/doctor/checks/install';
const errors = require('../../../../lib/errors');

describe('Unit: Doctor Checks > Install', function () {
    describe('Task definitions', function () {
        const installChecks = require(modulePath);

        it('operating system check skips correctly', function () {
            const stackCheck = installChecks.find(task => task.title === 'Checking operating system');

            expect(stackCheck).to.exist;
            expect(stackCheck.skip({}), 'doesn\'t skip by default').to.not.be.true;
            expect(stackCheck.skip({local: true}), 'skips if local').to.be.true;
            expect(stackCheck.skip({argv: {stack: false}}), 'skips if --no-stack is provided').to.be.true;
        });

        it('mysql check skips correctly', function () {
            const stackCheck = installChecks.find(task => task.title === 'Checking MySQL is installed');

            expect(stackCheck).to.exist;
            expect(stackCheck.skip({}), 'doesn\'t skip by default').to.not.be.true;
            expect(stackCheck.skip({local: true}), 'skips if local').to.be.true;
            expect(stackCheck.skip({argv: {db: 'sqlite3'}}), 'skips if db is sqlite3').to.be.true;
            expect(stackCheck.skip({argv: {dbhost: 'localhost'}}), 'no skip if dbhost is localhost').to.not.be.true;
            expect(stackCheck.skip({argv: {dbhost: '127.0.0.1'}}), 'no skip if dbhost is 127.0.0.1').to.not.be.true;
            expect(stackCheck.skip({argv: {dbhost: 'mysql.exernalhost.com'}}), 'skip if dbhost is remote').to.be.true;
        });
    });

    describe('node version check', function () {
        it('doesn\'t do anything if GHOST_NODE_VERSION_CHECK is false', function () {
            let originalEnv = process.env;
            let cliPackage = {
                engines: {
                    node: '0.10.0'
                }
            };
            process.env = { GHOST_NODE_VERSION_CHECK: 'false' };

            const task = proxyquire(modulePath, {
                '../../../../package': cliPackage
            }).tasks.nodeVersion;

            return task().then(() => {
                process.env = originalEnv;
            });
        });

        it('doesn\'t do anything if node version is in range', function () {
            let cliPackage = {
                engines: {
                    node: process.versions.node // this future-proofs the test
                }
            };

            const task = proxyquire(modulePath, {
                '../../../../package': cliPackage
            }).tasks.nodeVersion;

            return task();
        });

        it('throws error if node version is not in range', function () {
            let cliPackage = {
                engines: {
                    node: '0.10.0'
                }
            };

            const task = proxyquire(modulePath, {
                '../../../../package': cliPackage
            }).tasks.nodeVersion;

            return task().then(() => {
                expect(false, 'error should be thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.SystemError);
                let message = stripAnsi(error.message);

                expect(message).to.match(/Supported: 0.10.0/);
                expect(message).to.match(new RegExp(`Installed: ${process.versions.node}`));
            });
        });
    });

    describe('checkDirectoryAndAbove util', function () {
        it('returns if directory is root', function () {
            let lstatStub = sinon.stub().resolves();
            let isRootStub = sinon.stub().returns(true);

            const checkDirectoryAndAbove = proxyquire(modulePath, {
                'fs-extra': {lstat: lstatStub},
                'path-is-root': isRootStub
            }).tasks.checkDirectoryAndAbove;

            return checkDirectoryAndAbove('/some/dir').then(() => {
                expect(lstatStub.called).to.be.false;
                expect(isRootStub.calledOnce).to.be.true;
                expect(isRootStub.calledWithExactly('/some/dir')).to.be.true;
            });
        });

        it('recursively goes back to root if read is set to true', function () {
            let lstatStub = sinon.stub().resolves({ stats: true });
            let isRootStub = sinon.stub();
            let modeStub = sinon.stub().returns({others: {read: true}});
            isRootStub.onFirstCall().returns(false);
            isRootStub.onSecondCall().returns(false);
            isRootStub.onThirdCall().returns(true);

            const checkDirectoryAndAbove = proxyquire(modulePath, {
                'fs-extra': {lstat: lstatStub},
                'path-is-root': isRootStub,
                'stat-mode': modeStub
            }).tasks.checkDirectoryAndAbove;

            return checkDirectoryAndAbove('/some/dir').then(() => {
                expect(lstatStub.calledTwice).to.be.true;
                expect(modeStub.calledTwice).to.be.true;
                expect(isRootStub.calledThrice).to.be.true;

                expect(isRootStub.args).to.deep.equal([
                    ['/some/dir'],
                    ['/some/'],
                    ['/']
                ]);
            });
        });

        it('throws error if a directory isn\'t readable by others', function () {
            let lstatStub = sinon.stub().resolves({ stats: true });
            let isRootStub = sinon.stub();
            let modeStub = sinon.stub();

            isRootStub.onFirstCall().returns(false);
            isRootStub.onSecondCall().returns(false);
            isRootStub.onThirdCall().returns(true);

            modeStub.onFirstCall().returns({others: {read: true}});
            modeStub.onSecondCall().returns({others: {read: false}});

            const checkDirectoryAndAbove = proxyquire(modulePath, {
                'fs-extra': {lstat: lstatStub},
                'path-is-root': isRootStub,
                'stat-mode': modeStub
            }).tasks.checkDirectoryAndAbove;

            return checkDirectoryAndAbove('/root/ghost').then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.SystemError);
                expect(error.message).to.match(/path \/root\/ is not readable/);

                expect(isRootStub.calledTwice).to.be.true;
                expect(lstatStub.calledTwice).to.be.true;
                expect(modeStub.calledTwice).to.be.true;
            });
        });
    });

    describe('folderPermissions check', function () {
        it('throws error if current directory is not writable', function () {
            let accessStub = sinon.stub().rejects();
            const folderPermissions = proxyquire(modulePath, {
                'fs-extra': {access: accessStub}
            }).tasks.folderPermissions;

            return folderPermissions({}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.SystemError);
                expect(error.message).to.match(/current directory is not writable/);
                expect(accessStub.calledOnce).to.be.true;
                expect(accessStub.calledWith(process.cwd())).to.be.true;
            });
        });

        it('skips checking parent folder permissions if ctx.local is set', function () {
            let accessStub = sinon.stub().resolves();
            const tasks = proxyquire(modulePath, {
                'fs-extra': {access: accessStub}
            }).tasks;
            let checkDirectoryAndAbove = sinon.stub(tasks, 'checkDirectoryAndAbove').resolves();

            return tasks.folderPermissions({local: true}).then(() => {
                expect(accessStub.calledOnce).to.be.true;
                expect(checkDirectoryAndAbove.called).to.be.false;
            });
        });

        it('skips checking parent folder permissions if os is not linux', function () {
            let accessStub = sinon.stub().resolves();
            let platformStub = sinon.stub().returns('darwin');
            const tasks = proxyquire(modulePath, {
                'fs-extra': {access: accessStub},
                os: {platform: platformStub}
            }).tasks;
            let checkDirectoryAndAbove = sinon.stub(tasks, 'checkDirectoryAndAbove').resolves();

            return tasks.folderPermissions({}).then(() => {
                expect(accessStub.calledOnce).to.be.true;
                expect(platformStub.calledOnce).to.be.true;
                expect(checkDirectoryAndAbove.called).to.be.false;
            });
        });

        it('skips checking parent folder permissions if --no-setup-linux-user is passed', function () {
            let accessStub = sinon.stub().resolves();
            let platformStub = sinon.stub().returns('linux');
            const tasks = proxyquire(modulePath, {
                'fs-extra': {access: accessStub},
                os: {platform: platformStub}
            }).tasks;
            let checkDirectoryAndAbove = sinon.stub(tasks, 'checkDirectoryAndAbove').resolves();

            return tasks.folderPermissions({argv: {'setup-linux-user': false}}).then(() => {
                expect(accessStub.calledOnce).to.be.true;
                expect(platformStub.calledOnce).to.be.true;
                expect(checkDirectoryAndAbove.called).to.be.false;
            });
        });

        it('runs checkParentAndAbove if local not set and platform is linux', function () {
            let accessStub = sinon.stub().resolves();
            let platformStub = sinon.stub().returns('linux');
            const tasks = proxyquire(modulePath, {
                'fs-extra': {access: accessStub},
                os: {platform: platformStub}
            }).tasks;
            let checkDirectoryAndAbove = sinon.stub(tasks, 'checkDirectoryAndAbove').resolves();

            return tasks.folderPermissions({}).then(() => {
                expect(accessStub.calledOnce).to.be.true;
                expect(platformStub.calledOnce).to.be.true;
                expect(checkDirectoryAndAbove.calledOnce).to.be.true;
                expect(checkDirectoryAndAbove.calledWith(process.cwd())).to.be.true;
            });
        });
    });

    describe('system stack', function () {
        let logStub, confirmStub, execaStub;

        beforeEach(function () {
            logStub = sinon.stub();
            confirmStub = sinon.stub();
            execaStub = sinon.stub();
        });

        it('rejects if platform is not linux', function () {
            let platformStub = sinon.stub().returns('darwin');

            const systemStack = proxyquire(modulePath, {
                os: {platform: platformStub},
                execa: {shell: execaStub}
            }).tasks.systemStack;

            confirmStub.resolves({yes: false});

            return systemStack({ui: {log: logStub, confirm: confirmStub, allowPrompt: true}}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.SystemError);
                expect(error.message).to.equal('System checks failed.');
                expect(execaStub.called).to.be.false;
                expect(logStub.calledOnce).to.be.true;
                expect(logStub.args[0][0]).to.match(/failed with message/);
                expect(logStub.args[0][0]).to.match(/not Linux/);
                expect(confirmStub.calledOnce).to.be.true;
            });
        });

        it('does not call confirm if prompt is disabled', function () {
            let platformStub = sinon.stub().returns('darwin');

            const systemStack = proxyquire(modulePath, {
                os: {platform: platformStub},
                execa: {shell: execaStub}
            }).tasks.systemStack;

            confirmStub.resolves({yes: false});

            return systemStack({ui: {log: logStub, confirm: confirmStub}}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.SystemError);
                expect(error.message).to.equal('System checks failed.');
                expect(execaStub.called).to.be.false;
                expect(logStub.calledOnce).to.be.true;
                expect(logStub.args[0][0]).to.match(/failed with message/);
                expect(logStub.args[0][0]).to.match(/not Linux/);
                expect(confirmStub.called).to.be.false;
            });
        });

        it('does not reject if confirm resolves with true', function () {
            let platformStub = sinon.stub().returns('darwin');

            const systemStack = proxyquire(modulePath, {
                os: {platform: platformStub},
                execa: {shell: execaStub}
            }).tasks.systemStack;

            confirmStub.resolves({yes: true});

            return systemStack({ui: {log: logStub, confirm: confirmStub, allowPrompt: true}}).then(() => {
                expect(execaStub.called).to.be.false;
                expect(logStub.calledOnce).to.be.true;
                expect(logStub.args[0][0]).to.match(/failed with message/);
                expect(logStub.args[0][0]).to.match(/not Linux/);
                expect(confirmStub.calledOnce).to.be.true;
            });
        });

        it('rejects if lsb_release command does not exist', function () {
            let platformStub = sinon.stub().returns('linux');
            execaStub.rejects();

            const systemStack = proxyquire(modulePath, {
                os: {platform: platformStub},
                execa: {shell: execaStub}
            }).tasks.systemStack;

            confirmStub.resolves({yes: false});

            return systemStack({ui: {log: logStub, confirm: confirmStub, allowPrompt: true}}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.SystemError);
                expect(error.message).to.equal('System checks failed.');
                expect(execaStub.calledOnce).to.be.true;
                expect(logStub.calledOnce).to.be.true;
                expect(logStub.args[0][0]).to.match(/failed with message/);
                expect(logStub.args[0][0]).to.match(/not Ubuntu 16/);
                expect(confirmStub.calledOnce).to.be.true;
            });
        });

        it('rejects if lsb_release command does not return Ubuntu 16', function () {
            let platformStub = sinon.stub().returns('linux');
            execaStub.resolves({stdout: 'Ubuntu 14'});

            const systemStack = proxyquire(modulePath, {
                os: {platform: platformStub},
                execa: {shell: execaStub}
            }).tasks.systemStack;

            confirmStub.resolves({yes: false});

            return systemStack({ui: {log: logStub, confirm: confirmStub, allowPrompt: true}}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.SystemError);
                expect(error.message).to.equal('System checks failed.');
                expect(execaStub.calledOnce).to.be.true;
                expect(logStub.calledOnce).to.be.true;
                expect(logStub.args[0][0]).to.match(/failed with message/);
                expect(logStub.args[0][0]).to.match(/not Ubuntu 16/);
                expect(confirmStub.calledOnce).to.be.true;
            });
        });

        it('groups missing rejected promises for systemd and nginx', function () {
            let platformStub = sinon.stub().returns('linux');
            let listrStub = sinon.stub().rejects({
                errors: [{missing: 'systemd'}, {missing: 'nginx'}]
            });
            execaStub.withArgs('lsb_release -a').resolves({stdout: 'Ubuntu 16'});

            const systemStack = proxyquire(modulePath, {
                os: {platform: platformStub},
                execa: {shell: execaStub}
            }).tasks.systemStack;

            confirmStub.resolves({yes: false});

            return systemStack({ui: {log: logStub, confirm: confirmStub, allowPrompt: true, listr: listrStub}}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.SystemError);
                expect(error.message).to.equal('System checks failed.');
                expect(execaStub.calledOnce).to.be.true;
                expect(listrStub.calledOnce).to.be.true;
                expect(listrStub.args[0][2].renderer).to.equal('silent');
                expect(logStub.calledOnce).to.be.true;
                expect(logStub.args[0][0]).to.match(/failed with message/);
                expect(logStub.args[0][0]).to.match(/Missing package\(s\): systemd, nginx/);
                expect(confirmStub.calledOnce).to.be.true;
            });
        });

        it('nginx and systemd checks reject correctly', function () {
            let platformStub = sinon.stub().returns('linux');
            execaStub.withArgs('lsb_release -a').resolves({stdout: 'Ubuntu 16'});
            execaStub.withArgs('dpkg -l | grep nginx').rejects();
            execaStub.withArgs('dpkg -l | grep systemd').rejects();

            let listr = sinon.spy(function (tasks, ctx, opts) {
                expect(opts.renderer).to.equal('verbose');

                let systemdCheck = tasks.find(task => task.title.match(/systemd/));
                let nginxCheck = tasks.find(task => task.title.match(/nginx/));
                expect(systemdCheck).to.exist;
                expect(nginxCheck).to.exist;

                return systemdCheck.task().then(() => {
                    expect(false, 'error should have been thrown').to.be.true;
                }).catch((error) => {
                    expect(error).to.deep.equal({missing: 'systemd'});

                    return nginxCheck.task();
                }).then(() => {
                    expect(false, 'error should have been thrown').to.be.true;
                }).catch((error) => {
                    expect(error).to.deep.equal({missing: 'nginx'});

                    return Promise.reject({errors: [{missing: 'systemd'}, {missing: 'nginx'}]});
                });
            });

            const systemStack = proxyquire(modulePath, {
                os: {platform: platformStub},
                execa: {shell: execaStub}
            }).tasks.systemStack;

            confirmStub.resolves({yes: false});
            let ui = {log: logStub, confirm: confirmStub, verbose: true, allowPrompt: true, listr: listr};

            return systemStack({ui: ui}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.SystemError);
                expect(error.message).to.equal('System checks failed.');
                expect(execaStub.calledThrice).to.be.true;
                expect(logStub.calledOnce).to.be.true;
                expect(logStub.args[0][0]).to.match(/failed with message/);
                expect(logStub.args[0][0]).to.match(/Missing package\(s\): systemd, nginx/);
                expect(confirmStub.calledOnce).to.be.true;
            });
        });

        it('resolves if all stack conditions are met', function () {
            let platformStub = sinon.stub().returns('linux');
            execaStub.withArgs('lsb_release -a').resolves({stdout: 'Ubuntu 16'});
            let listrStub = sinon.stub().resolves();

            const systemStack = proxyquire(modulePath, {
                os: {platform: platformStub},
                execa: {shell: execaStub}
            }).tasks.systemStack;
            let ui = {log: logStub, confirm: confirmStub, allowPrompt: true, listr: listrStub};

            return systemStack({ui: ui}).then(() => {
                expect(platformStub.calledOnce).to.be.true;
                expect(listrStub.calledOnce).to.be.true;
                expect(logStub.called).to.be.false;
                expect(confirmStub.called).to.be.false;
            });
        });
    });

    describe('mysqlCheck', function () {
        it('appends sbin to path if platform is linux', function () {
            let execaStub = sinon.stub().resolves();
            let platformStub = sinon.stub().returns('linux');

            const mysqlCheck = proxyquire(modulePath, {
                execa: {shell: execaStub},
                os: {platform: platformStub}
            }).tasks.mysqlCheck;

            return mysqlCheck({}).then(() => {
                expect(platformStub.calledOnce).to.be.true;
                expect(execaStub.calledOnce).to.be.true;
                expect(execaStub.args[0][1].env).to.exist;
                expect(execaStub.args[0][1].env.PATH).to.match(/^\/usr\/sbin\:/);
            });
        });

        it('does not append sbin to path if platform is not linux', function () {
            let execaStub = sinon.stub().resolves();
            let platformStub = sinon.stub().returns('darwin');

            const mysqlCheck = proxyquire(modulePath, {
                execa: {shell: execaStub},
                os: {platform: platformStub}
            }).tasks.mysqlCheck;

            return mysqlCheck({}).then(() => {
                expect(platformStub.calledOnce).to.be.true;
                expect(execaStub.calledOnce).to.be.true;
                expect(execaStub.args[0][1]).to.be.empty;
            });
        });

        it('calls confirm if execa rejects and allowPrompt is true', function () {
            let execaStub = sinon.stub().rejects();
            let platformStub = sinon.stub().returns('linux');
            let logStub = sinon.stub();
            let confirmStub = sinon.stub().resolves({yes: true});

            const mysqlCheck = proxyquire(modulePath, {
                execa: {shell: execaStub},
                os: {platform: platformStub}
            }).tasks.mysqlCheck;

            let ui = {log: logStub, confirm: confirmStub, allowPrompt: true};

            return mysqlCheck({ui: ui}).then(() => {
                expect(platformStub.calledOnce).to.be.true;
                expect(execaStub.calledOnce).to.be.true;
                expect(logStub.calledOnce).to.be.true;
                expect(logStub.args[0][0]).to.match(/MySQL install not found/);
                expect(confirmStub.calledOnce).to.be.true;
            });
        });

        it('rejects if confirm says no', function () {
            let execaStub = sinon.stub().rejects();
            let platformStub = sinon.stub().returns('linux');
            let logStub = sinon.stub();
            let confirmStub = sinon.stub().resolves({yes: false});

            const mysqlCheck = proxyquire(modulePath, {
                execa: {shell: execaStub},
                os: {platform: platformStub}
            }).tasks.mysqlCheck;

            let ui = {log: logStub, confirm: confirmStub, allowPrompt: true};

            return mysqlCheck({ui: ui}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.SystemError);
                expect(error.message).to.equal('MySQL check failed.');

                expect(platformStub.calledOnce).to.be.true;
                expect(execaStub.calledOnce).to.be.true;
                expect(logStub.calledOnce).to.be.true;
                expect(logStub.args[0][0]).to.match(/MySQL install not found/);
                expect(confirmStub.calledOnce).to.be.true;
            });
        });

        it('rejects if allowPrompt is false', function () {
            let execaStub = sinon.stub().rejects();
            let platformStub = sinon.stub().returns('linux');
            let logStub = sinon.stub();
            let confirmStub = sinon.stub().resolves({yes: true});

            const mysqlCheck = proxyquire(modulePath, {
                execa: {shell: execaStub},
                os: {platform: platformStub}
            }).tasks.mysqlCheck;

            let ui = {log: logStub, confirm: confirmStub, allowPrompt: false};

            return mysqlCheck({ui: ui}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.SystemError);
                expect(error.message).to.equal('MySQL check failed.');

                expect(platformStub.calledOnce).to.be.true;
                expect(execaStub.calledOnce).to.be.true;
                expect(logStub.calledOnce).to.be.true;
                expect(logStub.args[0][0]).to.match(/MySQL install not found/);
                expect(confirmStub.calledOnce).to.be.false;
            });
        });
    });
});
