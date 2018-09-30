'use strict';
const {expect} = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const path = require('path');
const configStub = require('../../utils/config-stub');

const UI = require('../../../lib/ui/index');
const System = require('../../../lib/system');

const modulePath = '../../../lib/commands/setup';
const SetupCommand = require(modulePath);

describe('Unit: Commands > Setup', function () {
    it('localArgs', function () {
        const setup = new SetupCommand({}, {});

        const argvA = {
            local: true,
            url: 'http://localhost:2369',
            pname: 'local-ghost',
            process: 'local',
            db: 'mysql',
            stack: false,
            start: true
        };
        const argvB = {
            local: true,
            url: 'http://localhost:2368',
            pname: 'ghost-local',
            process: 'local',
            stack: false,
            start: true,
            db: 'sqlite3',
            dbpath: path.join(process.cwd(), 'content/data/ghost-local.db')
        };

        expect(setup.localArgs(argvA)).to.deep.equal(argvA);
        expect(setup.localArgs({local: true})).to.deep.equal(argvB);
        expect(setup.localArgs({local: true, start: false})).to.deep.equal(Object.assign(argvB, {start: false}));
    });

    describe('tasks', function () {
        function getTasks(stubs = {}, steps = []) {
            const Command = proxyquire(modulePath, stubs);
            const ui = sinon.createStubInstance(UI);
            const system = sinon.createStubInstance(System);
            const setup = new Command(ui, system);
            ui.confirm.resolves(false);

            const tasks = setup.tasks(steps);
            return {tasks, ui, system, setup};
        }

        it('returns default tasks correctly', function () {
            const {tasks} = getTasks();
            expect(tasks).to.have.length(4);
            tasks.forEach((task) => {
                expect(task).to.include.all.keys('id', 'task', 'enabled', 'title');
            });
        });

        it('wraps tasks correctly', function () {
            const task1stub = sinon.stub().resolves();
            const task2stub = sinon.stub().resolves();
            const steps = [
                [{
                    id: 'testing',
                    name: 'Testing',
                    task: task1stub
                }, {
                    id: 'testing-2',
                    title: 'Custom Title',
                    enabled: () => false,
                    task: task2stub
                }], null, [{
                    notarealtask: true
                }]
            ];
            const {tasks, ui} = getTasks({}, steps);

            // there should only be 2 tasks added
            expect(tasks).to.have.length(6);

            const task1 = tasks[3];
            const task2 = tasks[4];

            expect(task1.id).to.equal('testing');
            expect(task1.name).to.equal('Testing');
            expect(task1.title).to.equal('Setting up Testing');

            expect(task2.id).to.equal('testing-2');
            expect(task2.title).to.equal('Custom Title');

            expect(task1.enabled({
                argv: {stages: ['testing']}
            })).to.be.true;
            expect(task1.enabled({
                argv: {'setup-testing': false, stages: []}
            })).to.be.false;
            expect(task1.enabled({argv: {stages: []}}));

            expect(task2.enabled({
                argv: {stages: ['testing-2']}
            })).to.be.false;
            expect(task2.enabled({
                argv: {'setup-testing-2': false, stages: []}
            })).to.be.false;
            expect(task2.enabled({
                argv: {stages: []}
            })).to.be.false;

            const skip = sinon.stub().resolves();

            return task1.task({single: true}).then(() => {
                expect(ui.confirm.called).to.be.false;
                expect(task1stub.calledOnce).to.be.true;

                task1stub.resetHistory();
                return task1.task({single: false}, {skip});
            }).then(() => {
                expect(ui.confirm.calledOnceWithExactly('Do you wish to set up Testing?', true)).to.be.true;
                expect(task1stub.called).to.be.false;
                expect(skip.calledOnce).to.be.true;

                skip.resetHistory();
                ui.confirm.resetHistory();
                ui.confirm.resolves(true);
                return task1.task({single: false}, {skip});
            }).then(() => {
                expect(ui.confirm.calledOnceWithExactly('Do you wish to set up Testing?', true)).to.be.true;
                expect(task1stub.calledOnce).to.be.true;
                expect(skip.called).to.be.false;

                ui.confirm.reset();
                ui.confirm.resolves(false);
                skip.resetHistory();

                return task2.task({single: true}, {skip});
            }).then(() => {
                expect(ui.confirm.called).to.be.false;
                expect(task2stub.calledOnce).to.be.true;

                task2stub.resetHistory();
                return task2.task({single: false}, {skip});
            }).then(() => {
                expect(ui.confirm.calledOnceWithExactly('Do you wish to set up testing-2?', true)).to.be.true;
                expect(task2stub.called).to.be.false;
                expect(skip.calledOnce).to.be.true;

                skip.resetHistory();
                ui.confirm.resetHistory();
                ui.confirm.resolves(true);
                return task2.task({single: false}, {skip});
            }).then(() => {
                expect(ui.confirm.calledOnceWithExactly('Do you wish to set up testing-2?', true)).to.be.true;
                expect(task2stub.calledOnce).to.be.true;
                expect(skip.called).to.be.false;
            });
        });

        describe('internal (default) tasks', function () {
            it('config', function () {
                const stub = sinon.stub();
                const instance = {config: {config: true}};
                const {tasks, ui, system} = getTasks({
                    '../tasks/configure': stub
                });
                const [configTask] = tasks;

                expect(configTask.id).to.equal('config');
                expect(configTask.title).to.equal('Configuring Ghost');
                expect(stub.called).to.be.false;

                system.environment = 'testing';
                configTask.task({instance, argv: {thisisargs: true}, single: false});
                expect(stub.calledOnceWithExactly(
                    ui,
                    {config: true},
                    {thisisargs: true},
                    'testing',
                    true
                )).to.be.true;
            });

            it('instance', function () {
                const config = configStub();
                const instance = {config, dir: '/var/www/ghosttest'};
                const {tasks, system} = getTasks();
                const [,instanceTask] = tasks;

                expect(instanceTask.id).to.equal('instance');
                expect(instanceTask.title).to.equal('Setting up instance');

                const argv = {stages: []};

                // Check enabled fn
                instance.isSetup = true;
                expect(instanceTask.enabled({instance, argv})).to.be.false;
                instance.isSetup = false;
                expect(instanceTask.enabled({instance, argv})).to.be.true;

                // Test task
                config.has.returns(false);
                instanceTask.task({instance, argv: {pname: 'test-ghost'}, stages: []});
                expect(instance.name).to.equal('test-ghost');
                expect(config.get.called).to.be.false;
                expect(system.addInstance.calledOnceWithExactly(instance)).to.be.true;
                expect(config.has.calledOnceWithExactly('paths.contentPath')).to.be.true;
                expect(config.set.calledOnceWithExactly('paths.contentPath', '/var/www/ghosttest/content')).to.be.true;
                expect(config.save.calledOnce).to.be.true;

                config.has.returns(true);
                config.has.resetHistory();
                config.set.resetHistory();
                config.save.resetHistory();
                system.addInstance.resetHistory();
                config.get.returns('https://example.com');
                instanceTask.task({instance, argv});
                expect(instance.name).to.equal('example-com');
                expect(config.get.calledOnceWithExactly('url')).to.be.true;
                expect(system.addInstance.calledOnceWithExactly(instance)).to.be.true;
                expect(config.has.calledOnceWithExactly('paths.contentPath')).to.be.true;
                expect(config.set.called).to.be.false;
                expect(config.save.called).to.be.false;
            });

            it('linux-user', function () {
                const stub = sinon.stub();
                const {tasks, system} = getTasks({'../tasks/linux': stub});
                const [,,linuxTask] = tasks;

                expect(linuxTask.id).to.equal('linux-user');
                expect(linuxTask.name).to.equal('"ghost" system user');
                expect(linuxTask.title).to.equal('Setting up "ghost" system user');

                linuxTask.task({});
                expect(stub.calledOnce).to.be.true;

                expect(linuxTask.enabled({argv: {local: true, stages: []}})).to.be.false;
                system._platform = {linux: false};
                expect(linuxTask.enabled({argv: {local: false, stages: []}})).to.be.false;
                system._platform = {linux: true};
                expect(linuxTask.enabled({argv: {process: 'local', stages: []}})).to.be.false;
                expect(linuxTask.enabled({argv: {process: 'systemd', stages: []}})).to.be.true;
            });

            it('migrate', function () {
                const migrate = sinon.stub();
                const {tasks} = getTasks({'../tasks/migrator': {migrate}});
                const [,,,migrateTask] = tasks;

                expect(migrateTask.id).to.equal('migrate');
                expect(migrateTask.title).to.equal('Running database migrations');

                migrateTask.task({});
                expect(migrate.calledOnce).to.be.true;

                const instance = {version: '1.0.0'};
                expect(migrateTask.enabled({argv: {migrate: false, stages: []}, instance})).to.be.false;
                expect(migrateTask.enabled({argv: {stages: []}, instance})).to.be.true;
                instance.version = '2.0.0';
                expect(migrateTask.enabled({argv: {stages: []}, instance})).to.be.false;
            });
        });
    });

    describe('run', function () {
        it('Handles local setup properly', function () {
            const setup = new SetupCommand({}, {setEnvironment: () => {
                throw new Error('Take a break');
            }});

            const localArgs = sinon.stub(setup, 'localArgs');

            try {
                setup.run({local: true});
                expect(false, 'An error should have been thrown').to.be.true;
            } catch (error) {
                expect(error.message).to.equal('Take a break');
                expect(localArgs.calledOnce).to.be.true;
            }
        });

        it('calls correct methods when stages are passed in', function () {
            const ui = sinon.createStubInstance(UI);
            const system = sinon.createStubInstance(System);
            const setup = new SetupCommand(ui, system);
            const runCommand = sinon.stub(setup, 'runCommand').resolves();
            const run = sinon.stub().resolves([]);
            const checkEnvironment = sinon.stub();
            const instance = {checkEnvironment};
            const tasks = [{id: 'test', task1: true}, {id: 'test2', task2: true}];
            const taskStub = sinon.stub(setup, 'tasks').returns(tasks);
            const listr = {tasks, run};

            system.getInstance.returns(instance);
            system.hook.resolves([{step1: true}, {step2: true}]);
            ui.listr.returns(listr);
            ui.confirm.resolves(true);

            return setup.run({local: false, stages: ['test1', 'test2']}).then(() => {
                expect(system.getInstance.calledOnce).to.be.true;
                expect(checkEnvironment.calledOnce).to.be.true;
                expect(system.hook.calledOnceWithExactly('setup')).to.be.true;
                expect(taskStub.calledOnce).to.be.true;
                expect(taskStub.args[0]).to.deep.equal([
                    [{step1: true}, {step2: true}]
                ]);
                expect(ui.listr.calledOnce).to.be.true;
                expect(ui.listr.args[0]).to.deep.equal([
                    tasks,
                    false,
                    {exitOnError: false}
                ]);
                expect(run.calledOnce).to.be.true;
                const [[runArgs]] = run.args;
                expect(Object.keys(runArgs)).to.deep.equal(['ui', 'system', 'instance', 'tasks', 'listr', 'argv', 'single']);
                expect(runArgs.ui).to.equal(ui);
                expect(runArgs.system).to.equal(system);
                expect(runArgs.instance).to.equal(instance);
                expect(runArgs.tasks).to.deep.equal({
                    test: tasks[0],
                    test2: tasks[1]
                });
                expect(runArgs.listr).to.equal(listr);
                expect(runArgs.argv).to.deep.equal({local: false, stages: ['test1', 'test2']});
                expect(runArgs.single).to.be.true;
                expect(ui.confirm.called).to.be.false;
                expect(runCommand.called).to.be.false;
            });
        });

        it('doesn\'t prompt and doesn\'t start when argv.start is false', function () {
            const ui = sinon.createStubInstance(UI);
            const system = sinon.createStubInstance(System);
            const setup = new SetupCommand(ui, system);
            const runCommand = sinon.stub(setup, 'runCommand').resolves();
            const taskStub = sinon.stub(setup, 'tasks').returns([]);
            const run = sinon.stub().resolves([]);
            const checkEnvironment = sinon.stub();
            const instance = {checkEnvironment};

            system.getInstance.returns(instance);
            system.hook.resolves([]);
            ui.listr.returns({run, tasks: []});
            ui.confirm.resolves(true);

            return setup.run({start: false}).then(() => {
                expect(system.getInstance.calledOnce).to.be.true;
                expect(checkEnvironment.calledOnce).to.be.false;
                expect(system.hook.calledOnceWithExactly('setup')).to.be.true;
                expect(taskStub.calledOnce).to.be.true;
                expect(ui.listr.calledOnce).to.be.true;
                expect(run.calledOnce).to.be.true;
                const [[runArgs]] = run.args;
                expect(Object.keys(runArgs)).to.deep.equal(['ui', 'system', 'instance', 'tasks', 'listr', 'argv', 'single']);
                expect(runArgs.single).to.be.false;
                expect(ui.confirm.called).to.be.false;
                expect(runCommand.called).to.be.false;
            });
        });

        it('doesn\'t prompt and starts when argv.start is true', function () {
            const ui = sinon.createStubInstance(UI);
            const system = sinon.createStubInstance(System);
            const setup = new SetupCommand(ui, system);
            const runCommand = sinon.stub(setup, 'runCommand').resolves();
            const taskStub = sinon.stub(setup, 'tasks').returns(['some', 'tasks']);
            const run = sinon.stub().resolves([]);
            const checkEnvironment = sinon.stub();
            const instance = {checkEnvironment};

            system.getInstance.returns(instance);
            system.hook.resolves([]);
            ui.listr.returns({run, tasks: []});
            ui.confirm.resolves(true);

            return setup.run({start: true}).then(() => {
                expect(system.getInstance.calledOnce).to.be.true;
                expect(checkEnvironment.calledOnce).to.be.false;
                expect(system.hook.calledOnceWithExactly('setup')).to.be.true;
                expect(taskStub.calledOnce).to.be.true;
                expect(ui.listr.calledOnce).to.be.true;
                expect(run.calledOnce).to.be.true;
                const [[runArgs]] = run.args;
                expect(Object.keys(runArgs)).to.deep.equal(['ui', 'system', 'instance', 'tasks', 'listr', 'argv', 'single']);
                expect(runArgs.single).to.be.false;
                expect(ui.confirm.called).to.be.false;
                expect(runCommand.called).to.be.true;
            });
        });

        it('prompts and follows start prompt', function () {
            const ui = sinon.createStubInstance(UI);
            const system = sinon.createStubInstance(System);
            const setup = new SetupCommand(ui, system);
            const runCommand = sinon.stub(setup, 'runCommand').resolves();
            const taskStub = sinon.stub(setup, 'tasks').returns(['some', 'tasks']);
            const run = sinon.stub().resolves([]);
            const checkEnvironment = sinon.stub();
            const instance = {checkEnvironment};

            system.getInstance.returns(instance);
            system.hook.resolves([]);
            ui.listr.returns({run, tasks: []});
            ui.confirm.resolves(false);

            return setup.run({}).then(() => {
                expect(system.getInstance.calledOnce).to.be.true;
                expect(checkEnvironment.calledOnce).to.be.false;
                expect(system.hook.calledOnceWithExactly('setup')).to.be.true;
                expect(taskStub.calledOnce).to.be.true;
                expect(ui.listr.calledOnce).to.be.true;
                expect(run.calledOnce).to.be.true;
                const [[runArgs]] = run.args;
                expect(Object.keys(runArgs)).to.deep.equal(['ui', 'system', 'instance', 'tasks', 'listr', 'argv', 'single']);
                expect(runArgs.single).to.be.false;
                expect(ui.confirm.calledOnce).to.be.true;
                expect(runCommand.called).to.be.false;
            });
        });
    });

    // @todo: Add more tests if necessary
    it('configureOptions loops over extensions', function () {
        const extensions = [{
            config: {options: {setup: {test: true}}}
        }, {}];

        const yargs = {option: sinon.stub(), epilogue: () => true};
        yargs.option.returns(yargs);
        SetupCommand.configureOptions.call({options: {}}, 'Test', yargs, extensions, true);
        expect(yargs.option.called).to.be.true;
        expect(yargs.option.args[0][0]).to.equal('test');
    });
});
