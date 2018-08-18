'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const fs = require('fs-extra');
const UI = require('../../../lib/ui');
const System = require('../../../lib/system');
const StopCommand = require('../../../lib/commands/stop');

const modulePath = '../../../lib/commands/uninstall';
const UninstallCommand = require(modulePath);

const fileList = [
    '.ghost-cli',
    'config.production.json',
    'config.development.json'
];

describe('Unit: Commands > Uninstall', function () {
    afterEach(() => {
        sinon.restore();
    });

    function createInstance(proxied) {
        const ui = sinon.createStubInstance(UI);
        const system = sinon.createStubInstance(System);

        const Klass = proxied ? proxyquire(modulePath, proxied) : UninstallCommand;
        const instance = new Klass(ui, system);

        return {
            instance: instance,
            ui: ui,
            system: system
        };
    }

    describe('run', function () {
        it('prompts to confirm', function () {
            const command = createInstance();
            command.ui.confirm.resolves(true);
            command.ui.listr.resolves();

            return command.instance.run({}).then(() => {
                expect(command.ui.confirm.calledOnce).to.be.true;
                expect(command.ui.log.calledOnce).to.be.true;
                expect(command.ui.listr.calledOnce).to.be.true;
            });
        });

        it('doesn\'t run if the user backs out', function (done) {
            const argv = {force: true};
            const command = createInstance();
            command.ui.confirm.resolves(false);
            command.ui.listr.resolves();

            command.instance.run(argv).then(() => {
                done(new Error('run should have rejected'));
            }).catch(() => {
                expect(command.ui.confirm.calledOnce).to.be.true;
                expect(command.ui.log.called).to.be.false;
                expect(command.ui.listr.called).to.be.false;
                done();
            }).catch(done);
        });

        describe('steps', function () {
            function getSteps(instance, ui) {
                ui.confirm.resolves(true);
                ui.listr.resolves();

                return instance.run({force: true}).then(() => {
                    expect(ui.listr.calledOnce).to.be.true;
                    return ui.listr.args[0][0];
                });
            }

            it('step 1 (stopping ghost) - skips when ghost is not running', function () {
                const command = createInstance();
                const instance = {
                    running: sinon.stub().resolves(false),
                    loadRunningEnvironment: sinon.stub()
                };
                const runCommandStub = sinon.stub(command.instance, 'runCommand').resolves();
                const skipStub = sinon.stub();
                command.system.getInstance.returns(instance);

                return getSteps(command.instance, command.ui).then((steps) => {
                    const task = steps[0];

                    expect(task.title).to.equal('Stopping Ghost');

                    return task.task(null, {skip: skipStub});
                }).then(() => {
                    expect(instance.running.calledOnce).to.be.true;
                    expect(skipStub.calledOnce).to.be.true;
                    expect(instance.loadRunningEnvironment.calledOnce).to.be.false;
                    expect(runCommandStub.calledOnce).to.be.false;
                });
            });

            it('step 1 (stopping ghost) - doesn\'t skip when ghost is running', function () {
                const command = createInstance();
                const instance = {
                    running: sinon.stub().resolves(true),
                    loadRunningEnvironment: sinon.stub()
                };
                const runCommandStub = sinon.stub(command.instance, 'runCommand').resolves();
                const skipStub = sinon.stub();
                command.system.getInstance.returns(instance);

                return getSteps(command.instance, command.ui).then((steps) => {
                    const task = steps[0];

                    expect(task.title).to.equal('Stopping Ghost');

                    return task.task(null, {skip: skipStub});
                }).then(() => {
                    expect(instance.running.calledOnce).to.be.true;
                    expect(skipStub.calledOnce).to.be.false;
                    expect(instance.loadRunningEnvironment.calledOnce).to.be.true;
                    expect(runCommandStub.calledOnce).to.be.true;
                    expect(runCommandStub.calledWithExactly(
                        StopCommand,
                        {quiet: true, disable: true}
                    )).to.be.true;
                });
            });

            it('step 2 (removing content folder)', function () {
                const useGhostUserStub = sinon.stub().returns(false);
                const command = createInstance({
                    '../utils/use-ghost-user': {shouldUseGhostUser: useGhostUserStub}
                });
                command.system.getInstance.returns({dir: '/var/www/ghost'});
                command.ui.sudo.resolves();

                return getSteps(command.instance, command.ui).then((steps) => {
                    const task = steps[1];

                    expect(task.title).to.equal('Removing content folder');
                    expect(task.enabled()).to.be.false;
                    expect(useGhostUserStub.calledOnce).to.be.true;
                    expect(useGhostUserStub.calledWithExactly('/var/www/ghost/content')).to.be.true;

                    return task.task();
                }).then(() => {
                    expect(command.ui.sudo.calledOnce).to.be.true;
                    expect(command.ui.sudo.calledWithExactly('rm -rf /var/www/ghost/content'));
                });
            });

            it('step 3 (removing related configuration)', function () {
                const command = createInstance();
                const existsStub = sinon.stub(fs, 'existsSync').returns(true);
                command.system.getInstance.returns({instance: true, dir: '/var/www/ghost'});
                command.system.hook.resolves();

                return getSteps(command.instance, command.ui).then((steps) => {
                    const task = steps[2];

                    expect(task.title).to.equal('Removing related configuration');
                    return task.task();
                }).then(() => {
                    expect(existsStub.calledOnce).to.be.true;
                    expect(command.system.setEnvironment.calledOnce).to.be.true;
                    expect(command.system.setEnvironment.calledWithExactly(false)).to.be.true;
                    expect(command.system.hook.calledOnce).to.be.true;
                    expect(command.system.hook.calledWithExactly(
                        'uninstall',
                        {instance: true, dir: '/var/www/ghost'}
                    )).to.be.true;
                });
            });

            it('step 4 (removing ghost install)', function () {
                const command = createInstance();
                command.system.getInstance.returns({instance: true, dir: '/var/www/ghost'});
                const readdirStub = sinon.stub(fs, 'readdirSync').returns(fileList);
                const removeStub = sinon.stub(fs, 'remove').resolves();

                return getSteps(command.instance, command.ui).then((steps) => {
                    const task = steps[3];

                    expect(task.title).to.equal('Removing Ghost installation');
                    return task.task();
                }).then(() => {
                    expect(command.system.removeInstance.calledOnce).to.be.true;
                    expect(command.system.removeInstance.calledWithExactly({instance: true, dir: '/var/www/ghost'})).to.be.true;
                    expect(readdirStub.calledOnce).to.be.true;
                    expect(removeStub.callCount).to.equal(fileList.length);

                    fileList.forEach((f) => {
                        expect(removeStub.calledWithExactly(f)).to.be.true;
                    });
                });
            });
        });
    });
});
