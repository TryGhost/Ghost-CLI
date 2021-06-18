'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

const modulePath = '../../../../lib/commands/doctor/index';

describe('Unit: Commands > Doctor', function () {
    it('doesn\'t do anything if there are no checks to run (with log)', function () {
        const listrStub = sinon.stub().resolves();
        const logStub = sinon.stub();
        const hookStub = sinon.stub().resolves([]);
        const DoctorCommand = proxyquire(modulePath, {
            './checks': []
        });
        const instance = new DoctorCommand({listr: listrStub, log: logStub}, {hook: hookStub});

        return instance.run({}).then(() => {
            expect(listrStub.called).to.be.false;
            expect(hookStub.calledOnce).to.be.true;
            expect(hookStub.calledWithExactly('doctor')).to.be.true;
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.equal('No checks found to run.');
        });
    });

    it('doesn\'t do anything if there are no checks to run (with log + specific categories)', function () {
        const listrStub = sinon.stub().resolves();
        const logStub = sinon.stub();
        const hookStub = sinon.stub().resolves([]);
        const DoctorCommand = proxyquire(modulePath, {
            './checks': []
        });
        const instance = new DoctorCommand({listr: listrStub, log: logStub}, {hook: hookStub});

        return instance.run({categories: ['testing', 'validity']}).then(() => {
            expect(listrStub.called).to.be.false;
            expect(logStub.calledOnce).to.be.true;
            expect(hookStub.calledOnce).to.be.true;
            expect(hookStub.calledWithExactly('doctor')).to.be.true;
            expect(logStub.args[0][0]).to.equal('No checks found to run for categories "testing, validity".');
        });
    });

    it('doesn\'t do anything if there are no checks to run (without log)', function () {
        const listrStub = sinon.stub().resolves();
        const logStub = sinon.stub();
        const hookStub = sinon.stub().resolves([]);
        const DoctorCommand = proxyquire(modulePath, {
            './checks': []
        });
        const instance = new DoctorCommand({listr: listrStub, log: logStub}, {hook: hookStub});

        return instance.run({quiet: true}).then(() => {
            expect(listrStub.called).to.be.false;
            expect(hookStub.calledOnce).to.be.true;
            expect(hookStub.calledWithExactly('doctor')).to.be.true;
            expect(logStub.called).to.be.false;
        });
    });

    it('checks instance if skipInstanceCheck not passed, uses correct context', function () {
        const ui = {listr: sinon.stub().resolves()};
        const instanceStub = {checkEnvironment: sinon.stub()};
        const system = {
            getInstance: sinon.stub().returns(instanceStub),
            hook: sinon.stub().resolves([{
                title: 'Extension Task 1',
                task: 'someTask'
            }])
        };
        const findValidStub = sinon.stub();

        const DoctorCommand = proxyquire(modulePath, {
            '../../utils/find-valid-install': findValidStub,
            './checks': [{}]
        });
        const instance = new DoctorCommand(ui, system);

        return instance.run({test: true, a: 'b'}).then(() => {
            expect(findValidStub.calledOnce).to.be.true;
            expect(system.getInstance.calledOnce).to.be.true;
            expect(system.hook.calledOnce).to.be.true;
            expect(system.hook.calledWithExactly('doctor')).to.be.true;
            expect(instanceStub.checkEnvironment.calledOnce).to.be.true;
            expect(ui.listr.calledOnce).to.be.true;
            expect(ui.listr.args[0][0]).to.deep.equal([
                {},
                {
                    title: 'Extension Task 1',
                    task: 'someTask'
                }
            ]);
            const context = ui.listr.args[0][1];
            expect(context.argv).to.deep.equal({test: true, a: 'b'});
            expect(context.system).to.equal(system);
            expect(context.instance).to.equal(instanceStub);
            expect(context.ui).to.equal(ui);
            expect(context.local).to.be.false;
            expect(context.isDoctorCommand).to.be.false;
        });
    });

    it('skips instance check if skipInstanceCheck is true, uses correct context', function () {
        const ui = {listr: sinon.stub().resolves()};
        const instanceStub = {checkEnvironment: sinon.stub()};
        const system = {
            getInstance: sinon.stub().returns(instanceStub),
            hook: sinon.stub().resolves([{
                title: 'Extension Task 1',
                task: 'someTask'
            }])
        };
        const findValidStub = sinon.stub();

        const DoctorCommand = proxyquire(modulePath, {
            '../../utils/find-valid-install': findValidStub,
            './checks': [{}]
        });
        const instance = new DoctorCommand(ui, system);

        return instance.run({skipInstanceCheck: true, local: true, argv: true}).then(() => {
            expect(findValidStub.called).to.be.false;
            expect(system.getInstance.called).to.be.false;
            expect(system.hook.calledOnce).to.be.true;
            expect(system.hook.calledWithExactly('doctor')).to.be.true;
            expect(instanceStub.checkEnvironment.called).to.be.false;
            expect(ui.listr.calledOnce).to.be.true;
            expect(ui.listr.args[0][0]).to.deep.equal([
                {},
                {
                    title: 'Extension Task 1',
                    task: 'someTask'
                }
            ]);
            const context = ui.listr.args[0][1];
            expect(context.argv).to.deep.equal({skipInstanceCheck: true, local: true, argv: true});
            expect(context.system).to.equal(system);
            expect(context.instance).to.not.exist;
            expect(context.ui).to.equal(ui);
            expect(context.local).to.be.true;
            expect(context.isDoctorCommand).to.be.false;
        });
    });

    it('skips instance check if only category is install, uses correct context', function () {
        const ui = {listr: sinon.stub().resolves()};
        const instanceStub = {checkEnvironment: sinon.stub()};
        const system = {
            getInstance: sinon.stub().returns(instanceStub),
            hook: sinon.stub().resolves([{
                title: 'Extension Task 1',
                task: 'someTask'
            }])
        };
        const findValidStub = sinon.stub();

        const DoctorCommand = proxyquire(modulePath, {
            '../../utils/find-valid-install': findValidStub,
            './checks': [{category: ['install']}]
        });
        const instance = new DoctorCommand(ui, system);

        return instance.run({
            skipInstanceCheck: false,
            local: true,
            argv: true,
            categories: ['install'],
            _: ['doctor']
        }).then(() => {
            expect(findValidStub.called).to.be.false;
            expect(system.getInstance.called).to.be.false;
            expect(system.hook.calledOnce).to.be.true;
            expect(system.hook.calledWithExactly('doctor')).to.be.true;
            expect(instanceStub.checkEnvironment.called).to.be.false;
            expect(ui.listr.calledOnce).to.be.true;
            expect(ui.listr.args[0][0]).to.deep.equal([{category: ['install']}]);
            const context = ui.listr.args[0][1];
            expect(context.argv).to.deep.equal({
                skipInstanceCheck: false,
                local: true,
                argv: true,
                categories: ['install'],
                _: ['doctor']
            });
            expect(context.system).to.equal(system);
            expect(context.instance).to.not.exist;
            expect(context.ui).to.equal(ui);
            expect(context.local).to.be.true;
            expect(context.isDoctorCommand).to.be.true;
        });
    });

    describe('filters checks correctly', function () {
        const testChecks = [{
            title: 'Check 1',
            category: ['install']
        }, {
            title: 'Check 2',
            category: ['start']
        }, {
            title: 'Check 3',
            category: ['install', 'start']
        }];
        const listrStub = sinon.stub().resolves();
        const hookStub = sinon.stub().resolves([]);
        let instance;

        beforeEach(() => {
            const DoctorCommand = proxyquire(modulePath, {
                './checks': testChecks
            });
            instance = new DoctorCommand({listr: listrStub}, {hook: hookStub});
        });

        afterEach(() => {
            listrStub.resetHistory();
            hookStub.resetHistory();
        });

        it('doesn\'t filter if no categories passed', function () {
            return instance.run({skipInstanceCheck: true}).then(() => {
                expect(listrStub.calledOnce).to.be.true;
                expect(hookStub.calledOnce).to.be.true;
                const tasks = listrStub.args[0][0];
                expect(tasks).to.be.an('array');
                expect(tasks.length).to.equal(3);
            });
        });

        it('filters with one category passed', function () {
            return instance.run({skipInstanceCheck: true, categories: ['install']}).then(() => {
                expect(listrStub.calledOnce).to.be.true;
                expect(hookStub.calledOnce).to.be.true;
                const tasks = listrStub.args[0][0];
                expect(tasks).to.be.an('array');
                expect(tasks.length).to.equal(2);
                expect(tasks[0].title).to.equal('Check 1');
                expect(tasks[1].title).to.equal('Check 3');
            });
        });

        it('filters with another category passed', function () {
            return instance.run({skipInstanceCheck: true, categories: ['start']}).then(() => {
                expect(listrStub.calledOnce).to.be.true;
                expect(hookStub.calledOnce).to.be.true;
                const tasks = listrStub.args[0][0];
                expect(tasks).to.be.an('array');
                expect(tasks.length).to.equal(2);
                expect(tasks[0].title).to.equal('Check 2');
                expect(tasks[1].title).to.equal('Check 3');
            });
        });

        it('filters with multiple categories passed', function () {
            return instance.run({skipInstanceCheck: true, categories: ['install', 'start']}).then(() => {
                expect(listrStub.calledOnce).to.be.true;
                expect(hookStub.calledOnce).to.be.true;
                const tasks = listrStub.args[0][0];
                expect(tasks).to.be.an('array');
                expect(tasks.length).to.equal(3);
            });
        });
    });
});
