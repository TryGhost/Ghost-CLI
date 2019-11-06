const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const fs = require('fs-extra');
const UI = require('../../../lib/ui');
const System = require('../../../lib/system');

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

        const Command = proxied ? proxyquire(modulePath, proxied) : UninstallCommand;

        return {
            command: new Command(ui, system),
            ui: ui,
            system: system
        };
    }

    describe('run', function () {
        it('prompts to confirm', async function () {
            const {command, ui} = createInstance();

            ui.confirm.resolves(true);
            ui.listr.resolves();

            await command.run({});
            expect(ui.confirm.calledOnce).to.be.true;
            expect(ui.log.calledOnce).to.be.true;
            expect(ui.listr.calledOnce).to.be.true;
        });

        it('doesn\'t run if the user backs out', async function () {
            const argv = {force: true};
            const {command, ui} = createInstance();
            ui.confirm.resolves(false);
            ui.listr.resolves();

            await command.run(argv);
            expect(ui.confirm.calledOnce).to.be.true;
            expect(ui.log.called).to.be.false;
            expect(ui.listr.called).to.be.false;
        });

        describe('steps', function () {
            async function getSteps(command, ui) {
                ui.confirm.resolves(true);
                ui.listr.resolves();

                await command.run({force: true});
                expect(ui.listr.calledOnce).to.be.true;
                return ui.listr.args[0][0];
            }

            describe('step 1 (stopping ghost)', function () {
                it('skip', async function () {
                    const {command, ui, system} = createInstance();
                    const instance = {
                        isRunning: sinon.stub().resolves(false)
                    };
                    system.getInstance.returns(instance);

                    const [step1] = await getSteps(command, ui);
                    const result = await step1.skip();

                    expect(result).to.be.true;
                    expect(instance.isRunning.calledOnce).to.be.true;
                });

                it('task', async function () {
                    const {command, ui, system} = createInstance();
                    const instance = {
                        loadRunningEnvironment: sinon.stub(),
                        stop: sinon.stub().resolves()
                    };
                    system.getInstance.returns(instance);

                    const [step1] = await getSteps(command, ui);
                    await step1.task();

                    expect(instance.loadRunningEnvironment.calledOnce).to.be.true;
                    expect(instance.stop.calledOnce).to.be.true;
                });
            });

            it('step 2 (removing content folder)', async function () {
                const useGhostUserStub = sinon.stub().returns(false);
                const {command, ui, system} = createInstance({
                    '../utils/use-ghost-user': {shouldUseGhostUser: useGhostUserStub}
                });
                system.getInstance.returns({dir: '/var/www/ghost'});
                ui.sudo.resolves();

                const [,task] = await getSteps(command, ui);

                expect(task.title).to.equal('Removing content folder');
                expect(task.enabled()).to.be.false;
                expect(useGhostUserStub.calledOnce).to.be.true;
                expect(useGhostUserStub.calledWithExactly('/var/www/ghost/content')).to.be.true;

                await task.task();
                expect(ui.sudo.calledOnce).to.be.true;
                expect(ui.sudo.calledWithExactly('rm -rf /var/www/ghost/content'));
            });

            it('step 3 (removing related configuration)', async function () {
                const {command, ui, system} = createInstance();
                const existsStub = sinon.stub(fs, 'existsSync').returns(true);
                system.getInstance.returns({instance: true, dir: '/var/www/ghost'});
                system.hook.resolves();

                const [,,task] = await getSteps(command, ui);

                expect(task.title).to.equal('Removing related configuration');
                await task.task();

                expect(existsStub.calledOnce).to.be.true;
                expect(system.setEnvironment.calledOnce).to.be.true;
                expect(system.setEnvironment.calledWithExactly(false)).to.be.true;
                expect(system.hook.calledOnce).to.be.true;
                expect(system.hook.calledWithExactly(
                    'uninstall',
                    {instance: true, dir: '/var/www/ghost'}
                )).to.be.true;
            });

            it('step 4 (removing ghost install)', async function () {
                const {command, ui, system} = createInstance();
                system.getInstance.returns({instance: true, dir: '/var/www/ghost'});
                const readdirStub = sinon.stub(fs, 'readdirSync').returns(fileList);
                const removeStub = sinon.stub(fs, 'remove').resolves();

                const [,,,task] = await getSteps(command, ui);

                expect(task.title).to.equal('Removing Ghost installation');
                await task.task();

                expect(system.removeInstance.calledOnce).to.be.true;
                expect(system.removeInstance.calledWithExactly({instance: true, dir: '/var/www/ghost'})).to.be.true;
                expect(readdirStub.calledOnce).to.be.true;
                expect(removeStub.callCount).to.equal(fileList.length);

                fileList.forEach((f) => {
                    expect(removeStub.calledWithExactly(f)).to.be.true;
                });
            });
        });
    });
});
