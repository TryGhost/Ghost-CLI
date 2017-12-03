'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const Promise = require('bluebird');
const path = require('path');

const modulePath = '../../../lib/commands/setup';
const SetupCommand = require(modulePath);

describe.only('Unit: Commands > Setup', function () {
    it('Constructor initializes stages', function () {
        const setup = new SetupCommand({},{});
        expect(setup.stages).to.be.an('array');
        expect(setup.stages.length).to.equal(0);
    });

    it('addStage pushes to stages', function () {
        const setup = new SetupCommand({},{});
        const expectedA = {
            name: 'Eat',
            description: 'Consume food',
            dependencies: ['food', 'water'],
            fn: () => true
        };
        const expectedB = {
            name: 'Sleep',
            dependencies: 'bed',
            fn: () => false
        };
        const expectedC = {
            name: 'Code',
            dependencies: [],
            fn: () => false
        };
        const expectedD = {
            name: 'Repeat',
            fn: () => 'Foundation',
            dependencies: null
        };
        setup.addStage(expectedA.name, expectedA.fn, expectedA.dependencies, expectedA.description);
        setup.addStage(expectedB.name, expectedB.fn, expectedB.dependencies, expectedB.description);
        setup.addStage(expectedC.name, expectedC.fn, expectedC.dependencies, expectedC.description);
        setup.addStage(expectedD.name, expectedD.fn, expectedD.dependencies, expectedD.description);

        expectedB.dependencies = ['bed'];
        expectedB.description = 'Sleep';
        expectedC.description = 'Code';
        expectedD.description = 'Repeat';

        expect(setup.stages.length).to.equal(4);
        expect(setup.stages[0]).to.deep.equal(expectedA);
        expect(setup.stages[1]).to.deep.equal(expectedB);
        expect(setup.stages[2]).to.deep.equal(expectedC);
        expect(setup.stages[3]).to.deep.equal(expectedD);
    });

    describe('run', function () {
        it('Handles local setup properly', function () {
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
                url: 'http://localhost:2368/',
                pname: 'ghost-local',
                process: 'local',
                stack: false,
                start: true,
                db: 'sqlite3',
                dbpath: path.join(process.cwd(), 'content/data/ghost-local.db')
            };
            let argVSpy = {
                local: true,
                url: 'http://localhost:2369',
                pname: 'local-ghost',
                process: 'local',
                db: 'mysql'
            };

            const setup = new SetupCommand({}, {setEnvironment: () => {throw new Error('Take a break')}});

            try {
                setup.run(Object.assign(argVSpy, argvA));
                expect(false, 'An error should have been thrown').to.be.true;
            } catch (error) {
                expect(error.message).to.equal('Take a break');
                expect(argVSpy).to.deep.equal(argvA);
                argVSpy = {local: true};
            }

            try {
                setup.run(argVSpy);
                expect(false, 'An error should have been thrown').to.be.true;
            } catch (error) {
                expect(error.message).to.equal('Take a break');
                expect(argVSpy).to.deep.equal(argvB);
            }
        });

        it('Hooks when stages are passed through', function () {
            let stages = []
            const stubs = {
                noCall: sinon.stub().resolves(),
                important: sinon.stub().resolves(),
                hook: sinon.stub().callsFake((n, ths) => {ths.stages = stages; return Promise.resolve()}),
                listr: sinon.stub().callsFake((tasks) => {tasks.forEach((task) => task.task())})
            };
            stages = [{name: 'nocall', fn: stubs.noCall}, {name: 'important', fn: stubs.important}];
            const system = {
                getInstance: () => ({checkEnvironment: () => true}),
                hook: stubs.hook
            };
            const ui = {listr: stubs.listr};
            const setup = new SetupCommand(ui, system);
            return setup.run({stages: ['important']}).then(() => {
                expect(stubs.hook.calledOnce).to.be.true;
                expect(stubs.noCall.called).to.be.false;
                expect(stubs.important.calledOnce).to.be.true;
                expect(stubs.listr.calledOnce).to.be.true;
            });
        });

        describe('special case migrations', function () {
            it('db migrations', function () {
                const system = {
                    getInstance: () => ({checkEnvironment: () => true}),
                    hook: () => Promise.resolve()
                };
                const ui = {
                    listr: sinon.stub().callsFake((tasks) => {
                        expect(tasks[0].title).to.equal('Running database migrations');
                        expect(tasks[0].task.name).to.equal('runMigrations');
                        return Promise.resolve();
                    })
                };
                const setup = new SetupCommand(ui, system);

                return setup.run({stages: ['migrate']}).then(() => {
                    expect(ui.listr.calledOnce).to.be.true;
                });
            });

            it('linx-user', function () {
                const system = {
                    getInstance: () => ({checkEnvironment: () => true}),
                    hook: () => Promise.resolve()
                };
                const ui = {
                    listr: sinon.stub().callsFake((tasks) => {
                        expect(tasks[0].title).to.equal('Setting up "ghost" system user');
                        expect(tasks[0].task.name).to.equal('bound linuxSetupTask');
                        return Promise.resolve();
                    })
                };
                const setup = new SetupCommand(ui, system);

                return setup.run({stages: ['linux-user']}).then(() => {
                    expect(ui.listr.calledOnce).to.be.true;
                });
            });

            it('linx-user (on windows)', function () {
                const system = {
                    getInstance: () => ({checkEnvironment: () => true}),
                    hook: () => Promise.resolve()
                };
                const osStub = {platform: () => 'win32'};
                const ui = {
                    listr: sinon.stub().callsFake((tasks) => {
                        expect(tasks.length).to.equal(0);
                        return Promise.resolve();
                    }),
                    log: sinon.stub()
                };
                const SetupCommand = proxyquire(modulePath, {os: osStub});
                const setup = new SetupCommand(ui, system);

                return setup.run({stages: ['linux-user']}).then(() => {
                    expect(ui.log.calledOnce).to.be.true;
                    expect(ui.log.getCall(0).args[0]).to.match(/is not Linux/);
                });
            });
        });

        it('Initial stage is setup properly', function () {
            const listr = sinon.stub().resolves();
            const aIstub = sinon.stub();
            const system = {
                getInstance: () => {
                    return {
                        checkEnvironment: () => true,
                        apples: true,
                        config: {get: () => 'https://ghost.org'}
                    };
                },
                addInstance: aIstub,
                hook: () => Promise.resolve()
            };
            const ui = {
                run: () => Promise.resolve(),
                listr: listr,
                confirm: () => Promise.resolve({yes: false})
            };
            const argv = {
                prompt: true,
                'setup-linux-user': false,
                migrate: false
            };

            const setup = new SetupCommand(ui, system);
            return setup.run(argv).then(() => {
                expect(listr.calledOnce).to.be.true;
                const tasks = listr.getCall(0).args[0];
                expect(tasks[0].title).to.equal('Setting up instance');
                tasks.forEach(function (task) {
                    expect(task.title).to.not.match(/database migrations/);
                })

                const ctx = {};
                tasks[0].task(ctx);

                expect(ctx.instance).to.be.ok;
                expect(ctx.instance.apples).to.be.true;
                expect(ctx.instance.name).to.equal('ghost-org');
                expect(aIstub.calledOnce).to.be.true;
                expect(aIstub.getCall(0).args[0]).to.deep.equal(ctx.instance);
            });
        });

        describe('task dependency checks', function () {
            let stubs, ui, system;

            beforeEach(function () {
                stubs = {
                    test: sinon.stub(),
                    zest: sinon.stub(),
                    listr: sinon.stub().resolves(),
                    skipped: sinon.stub(),
                    skip: sinon.stub(),
                    log: sinon.stub()
                };
                ui = {
                    run: () => Promise.resolve(),
                    listr: stubs.listr,
                    log: stubs.log
                };
                system = {
                    hook: () => Promise.resolve()
                };
            });

            it('everything is fine', function () {
                stubs.skipped.returns(false);
                const setup = new SetupCommand(ui, system);
                setup.runCommand = () => Promise.resolve();

                setup.addStage('test', stubs.test, [], 'Test');
                setup.addStage('zest', stubs.zest, ['test'], 'Zesty');

                return setup.run({prompt: false}).then(() => {
                    expect(stubs.listr.calledOnce).to.be.true;

                    const tasks = stubs.listr.getCall(0).args[0];

                    expect(tasks[2].title).to.match(/Test/);
                    expect(tasks[3].title).to.match(/Zesty/);
                    tasks[2].task({}, {_task: {isSkipped: stubs.skipped}});
                    expect(stubs.test.calledOnce).to.be.true;

                    tasks[3].task({}, {});
                    expect(stubs.skipped.calledOnce).to.be.true;
                    expect(stubs.zest.calledOnce).to.be.true;
                });
            });

            it('unknown dependency', function () {
                const expectLog = new RegExp(/(?=.*test)(?=.*stage, which was)/);
                const setup = new SetupCommand(ui, system);
                setup.runCommand = () => Promise.resolve();
                setup.addStage('zest', stubs.zest, ['test'], 'Zesty');

                return setup.run({prompt: false}).then(() => {
                    expect(stubs.listr.calledOnce).to.be.true;
                    const tasks = stubs.listr.getCall(0).args[0];

                    expect(tasks[2].title).to.match(/Zesty/);
                    tasks[2].task({}, {skip: stubs.skip});

                    expect(stubs.zest.calledOnce).to.be.false;
                    expect(stubs.skip.calledOnce).to.be.true;
                    expect(stubs.log.calledOnce).to.be.true;
                    expect(stubs.log.getCall(0).args[0]).to.match(expectLog);
                });
            });

            it('dependency was skipped', function () {
                stubs.skipped.returns(true);
                const expectLog = new RegExp(/(?=.*test)(?=.*stage, which was)/);
                const setup = new SetupCommand(ui, system);
                setup.runCommand = () => Promise.resolve();

                setup.addStage('test', stubs.test, [], 'Test');
                setup.addStage('zest', stubs.zest, ['test'], 'Zesty');

                return setup.run({prompt: false}).then(() => {
                    expect(stubs.listr.calledOnce).to.be.true;
                    const tasks = stubs.listr.getCall(0).args[0];

                    expect(tasks[2].title).to.match(/Test/);
                    expect(tasks[3].title).to.match(/Zesty/);

                    tasks[2].task({}, {_task: {isSkipped: stubs.skipped}});
                    expect(stubs.test.calledOnce).to.be.true;
                    tasks[3].task({}, {skip: stubs.skip});
                    expect(stubs.skipped.calledOnce).to.be.true;

                    expect(stubs.zest.calledOnce).to.be.false;
                    expect(stubs.skip.calledOnce).to.be.true;
                    expect(stubs.log.calledOnce).to.be.true;
                    expect(stubs.log.getCall(0).args[0]).to.match(expectLog);
                });
            });

            it('multiple dependencies did not run', function () {
                const expectLog = new RegExp(/(?=.*'test', 'rest')(?=.*stages, which were)/);
                const setup = new SetupCommand(ui, system);
                setup.runCommand = () => Promise.resolve();
                setup.addStage('zest', stubs.zest, ['test', 'rest'], 'Zesty');

                return setup.run({prompt: false}).then(() => {
                    expect(stubs.listr.calledOnce).to.be.true;
                    const tasks = stubs.listr.getCall(0).args[0];

                    expect(tasks[2].title).to.match(/Zesty/);
                    tasks[2].task({}, {skip: stubs.skip});
                    expect(stubs.zest.calledOnce).to.be.false;

                    expect(stubs.skip.calledOnce).to.be.true;
                    expect(stubs.log.calledOnce).to.be.true;
                    expect(stubs.log.getCall(0).args[0]).to.match(expectLog);
                });
            });
        });

        it('honors stage skipping via arguments', function () {
            const ui = {
                run: (a) => a(),
                listr: sinon.stub().resolves()
            };
            const skipStub = sinon.stub();
            const system = {hook: () => Promise.resolve()};
            const setup = new SetupCommand(ui, system);
            setup.runCommand = () => Promise.resolve();
            setup.addStage('zest', () => true, null, 'Zesty');

            return setup.run({prompt: false, 'setup-zest': false}).then(() => {
                expect(ui.listr.calledOnce).to.be.true;
                const tasks = ui.listr.getCall(0).args[0];

                expect(tasks[2].title).to.match(/Zesty/);
                tasks[2].task({}, {skip: skipStub});
                expect(skipStub.calledOnce).to.be.true;
            });
        });

        it('normally prompts to run a stage', function () {
            function confirm(a) {
                return Promise.resolve({yes: a.indexOf('Z') < 0});
            }
            const ui = {
                run: (a) => a(),
                log: () => true,
                listr: sinon.stub().resolves(),
                confirm: sinon.stub().callsFake(confirm)
            };
            const skipStub = sinon.stub();
            const system = {hook: () => Promise.resolve()};
            const setup = new SetupCommand(ui, system);
            let tasks;
            setup.runCommand = () => Promise.resolve();

            setup.addStage('zest', () => true, null, 'Zesty');
            setup.addStage('test', () => true, null, 'Test');

            return setup.run({prompt: true, start: false}).then(() => {
                expect(ui.listr.calledOnce).to.be.true;
                tasks = ui.listr.getCall(0).args[0];

                expect(tasks[2].title).to.match(/Zesty/);
                expect(tasks[3].title).to.match(/Test/);

                return tasks[2].task({}, {skip: skipStub});
            }).then(() => tasks[3].task({}, {})).then(() => {
                expect(skipStub.calledOnce).to.be.true;
                expect(ui.confirm.calledTwice).to.be.true;
                expect(ui.confirm.getCall(0).args[0]).to.match(/Zesty/);
                expect(ui.confirm.getCall(1).args[0]).to.match(/Test/);
            });
        });
    });

    // @todo: Any more tests to be added for this?
    it('configureOptions loops over extensions', function () {
        const extensions = [{
            config: {options: {setup: {test: true}}}
        }, {}];

        const yargs = {option: sinon.stub(), epilogue: () => true};
        yargs.option.returns(yargs);
        SetupCommand.configureOptions.call({options: {}}, 'Test', yargs, extensions, true);
        expect(yargs.option.called).to.be.true;
        expect(yargs.option.getCall(0).args[0]).to.equal('test');
    });
});
