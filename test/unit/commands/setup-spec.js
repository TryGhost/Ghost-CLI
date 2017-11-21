'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const Promise = require('bluebird');
const path = require('path');

const modulePath = '../../../lib/commands/setup';
const SetupCommand = require(modulePath);
const errors = require('../../../lib/errors');

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
            dependencies: ['food'],
            fn: () => true
        };
        const expectedB = {
            name: 'Sleep',
            dependencies: 'bed',
            fn: () => false
        };
        const expectedC = {
            name: 'Code',
            fn: () => 'Ghost'
        };
        setup.addStage(expectedA.name, expectedA.fn, expectedA.dependencies, expectedA.description);
        setup.addStage(expectedB.name, expectedB.fn, expectedB.dependencies, expectedB.description);
        setup.addStage(expectedC.name, expectedC.fn, expectedC.dependencies, expectedC.description);

        expectedB.dependencies = ['bed'];
        expectedC.dependencies = [undefined];
        expectedB.description = 'Sleep';
        expectedC.description = 'Code';

        expect(setup.stages.length).to.equal(3);
        expect(setup.stages[0]).to.deep.equal(expectedA);
        expect(setup.stages[1]).to.deep.equal(expectedB);
        // @todo: Figure out what's wrong with this (specifically dependencies)
        // expect(setup.stages[2], 'C').to.deep.equal(expectedC);
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
                hook: stubs.hook,
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
                // @todo: figure out why this doesn't work
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

                return setup.run({stages: ['cobra']}).then(() => {
                    expect(ui.log.calledOnce).to.be.true;
                    expect(ui.log.getCall(0).args[0]).to.match(/is not Linux/);
                });
            });
        });
    });
});
