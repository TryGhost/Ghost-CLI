'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const modulePath = '../../../lib/commands/uninstall';

const UninstallCommand = require(modulePath);

const fileList = [
    '.ghost-cli',
    'config.production.json',
    'config.development.json'
]

function proxiedUninstall(platform) {
    const stubs = {
        remove: sinon.stub(),
        readdirSync: sinon.stub().returns(fileList),
        existsSync: sinon.stub().returns(true)
    };

    const instance = new (proxyquire(modulePath, {
        'fs-extra': {
            remove: stubs.remove,
            readdirSync: stubs.readdirSync,
            existsSync: stubs.existsSync
        },
        os: {
            platform: () => (platform || 'linux')
        }
    }))();

    return {
        instance: instance,
        stubs: stubs
    }
}

describe('Unit: Commands > Uninstall', function () {
    describe('run', function () {
        let uninstall, context, argv;

        beforeEach(function () {
            uninstall = new UninstallCommand();
            context = {
                ui: {
                    prompt: sinon.stub().resolves({sure: true}),
                    log: () => true,
                    listr: sinon.stub().resolves()
                },
                system: {getInstance: () => true}
            };

            argv = {
                force: false,
                prompt: true
            };
        });
        it('Doesn\'t prompt if force flag', function () {
            argv.force = true;
            return uninstall.run.call(context, argv).then(() => {
                expect(context.ui.prompt.called).to.be.false;
                expect(context.ui.listr.calledOnce).to.be.true;
            });
        });

        it('Doesn\'t prompt if prompting is disabled', function () {
            argv.prompt = false;
            return uninstall.run.call(context, argv).then(() => {
                expect(context.ui.prompt.called).to.be.false;
                expect(context.ui.listr.calledOnce).to.be.true;
            });
        });

        it('Normally prompts', function () {
            return uninstall.run.call(context, argv).then(() => {
                expect(context.ui.prompt.calledOnce).to.be.true;
                expect(context.ui.listr.calledOnce).to.be.true;
            });
        });

        it('Doesn\'t run when the user backs out', function () {
            context.ui.prompt = sinon.stub().resolves({sure: false});

            return uninstall.run.call(context, argv)
                .then(() => {
                    expect(false, 'Promise should have rejected').to.be.true;
                })
                .catch(() => {
                    expect(context.ui.prompt.calledOnce).to.be.true;
                    expect(context.ui.listr.called).to.be.false;
                });
        });

        describe('Uninstall steps work', function () {
            let tasklist, stubs;

            beforeEach(function () {
                const commandThings = proxiedUninstall();
                stubs = Object.assign({
                    listr: sinon.stub(),
                    running: sinon.stub().returns(false),
                    lre: sinon.stub(),
                    rc: sinon.stub().returns()
                }, commandThings.stubs);

                uninstall = commandThings.instance;

                context.ui.listr = stubs.listr;
                context.runCommand = stubs.rc;
                context.system.getInstance = sinon.stub().returns({
                    running: stubs.running,
                    loadRunningEnvironment: stubs.lre,
                    dir: '/var/www/ghost'
                });

                return uninstall.run.call(context, argv).then(() => {
                    expect(stubs.listr.calledOnce).to.be.true;
                    tasklist = stubs.listr.args[0][0];
                });
            });

            afterEach(function () {
                stubs = null;
                tasklist = null;
            });

            it('step 1 (stop ghost)', function () {
                const task = tasklist[0];
                expect(task.title).to.equal('Stopping Ghost');

                expect(task.skip()).to.be.true;
                expect(stubs.running.calledOnce).to.be.true;

                task.task();

                expect(stubs.rc.calledOnce).to.be.true;
                expect(stubs.lre.calledOnce).to.be.true;
            });

            it('step 2 (remove content linux)', function () {
                stubs.sudo = sinon.stub();
                context.ui.sudo = stubs.sudo;
                const task = tasklist[1];
                const cmd = 'rm -rf /var/www/ghost/content';
                expect(task.title).to.equal('Removing content folder');

                task.task();

                expect(stubs.remove.called).to.be.false;
                expect(stubs.sudo.calledOnce).to.be.true
                expect(stubs.sudo.args[0][0]).to.equal(cmd);
            });

            // Todo: optimize if possible (because of beforeEach proxyUninstall is
            // called 2x for 1 test)
            it('step 2 (remove contexnt non linux)', function () {
                const commandThings = proxiedUninstall('not_linux');
                stubs = Object.assign({listr: sinon.stub()}, commandThings.stubs);
                uninstall = commandThings.instance;

                context.ui.listr = stubs.listr;
                context.system.getInstance = sinon.stub().returns({dir: '/var/www/ghost'});

                return uninstall.run.call(context, argv).then(() => {
                    expect(stubs.listr.calledOnce).to.be.true;
                    return stubs.listr.args[0][0][1];
                }).then((task) => {
                    expect(task.title).to.equal('Removing content folder');
                    task.task();

                    expect(stubs.remove.called).to.be.true;
                });
            });

            it('step 3 (remove config)', function () {
                stubs.hook = sinon.stub();
                context.system.setEnvironment = () => true;
                context.system.hook = stubs.hook;

                const task = tasklist[2];
                expect(task.title).to.equal('Removing related configuration');

                task.task();

                expect(stubs.hook.calledOnce).to.be.true;
            });

            it('step 4 (remove install)', function () {
                stubs.ri = sinon.stub();
                context.system.removeInstance = stubs.ri
                const task = tasklist[3];
                expect(task.title).to.equal('Removing Ghost installation');

                task.task();

                expect(stubs.ri.calledOnce).to.be.true;
                expect(stubs.remove.calledThrice).to.be.true;
            });
        });
    });
});
