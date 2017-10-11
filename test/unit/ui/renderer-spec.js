'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const modulePath = '../../../lib/ui/renderer';
const Renderer = require(modulePath);

// TODO: remove line once tests are implemented
require(modulePath);

describe('Unit: UI > Renderer', function () {
    it('can be created successfully', function () {
        const rdr = new Renderer();

        expect(rdr).to.be.ok;
    });

    describe('#render', function () {
        let rdr;

        before(function () {
            rdr = new Renderer();
        });

        it('returns when id is set', function (done) {
            const ctx = {subscribeToEvents: sinon.stub(), id: 42};
            rdr.render.bind(ctx)();

            // Should be unreachable
            expect(ctx.subscribeToEvents.called).to.be.false;

            done();
        });

        it('subscribes to events', function (done) {
            const ctx = {
                subscribeToEvents: sinon.stub(),
                ui: {},
                options: {},
                frame: sinon.stub()
            };
            rdr.render.bind(ctx)();

            expect(ctx.subscribeToEvents.calledOnce).to.be.true;
            expect(ctx.id).to.exist;
            // Give frame time to be called
            setTimeout(function () {
                expect(ctx.frame.called).to.be.true;
                clearInterval(ctx.id);
                done();
            }, 10);
        });
    });

    describe('#subscribeToEvents', function () {
        let rdr;

        before(function () {
            rdr = new Renderer();
        });


        it('calls subscribe on every task', function (done) {
            const ctx = {
                tasks: [
                    {subscribe: sinon.stub()},
                    {subscribe: sinon.stub()},
                ]
            };

            rdr.subscribeToEvents.bind(ctx)();

            expect(ctx.tasks[0].subscribe.calledOnce).to.be.true;
            expect(ctx.tasks[1].subscribe.calledOnce).to.be.true;

            done();
        });

        it('callback does nothing when event is not state', function (done) {
            const subStub = sinon.stub()
            const ctx = {
                tasks: [{subscribe: subStub}],
                spinner: {
                    succeed: sinon.stub(),
                    info: sinon.stub(),
                    fail: sinon.stub()
                }
            };

            rdr.subscribeToEvents.bind(ctx)();

            expect(subStub.calledOnce).to.be.true;
            // execute the callback
            subStub.firstCall.args[0]({type: 'EVENT'});

            expect(ctx.spinner.succeed.called).to.be.false;
            expect(ctx.spinner.info.called).to.be.false;
            expect(ctx.spinner.fail.called).to.be.false;

            done();
        });

        it('succeed spinner called when task completes', function (done) {
            const subStub = sinon.stub();
            const completeStub = sinon.stub().returns(true);
            const skipStub = sinon.stub().returns(false);
            const failStub = sinon.stub().returns(false);
            const ctx = {
                tasks: [{
                    subscribe: subStub,
                    isCompleted: completeStub,
                    isSkipped: skipStub,
                    hasFailed: failStub
                }],
                spinner: {
                    succeed: sinon.stub(),
                    info: sinon.stub(),
                    fail: sinon.stub()
                }
            };

            rdr.subscribeToEvents.bind(ctx)();

            expect(subStub.calledOnce).to.be.true;
            // update values and execute callback
            subStub.firstCall.args[0].bind(ctx)({type: 'STATE'});

            expect(ctx.spinner.succeed.called).to.be.true;
            expect(ctx.spinner.info.called).to.be.false;
            expect(ctx.spinner.fail.called).to.be.false;

            done();
        });

        it('info spinner called when task skips', function (done) {
            const subStub = sinon.stub();
            const completeStub = sinon.stub().returns(false);
            const skipStub = sinon.stub().returns(true);
            const failStub = sinon.stub().returns(false);
            const ctx = {
                tasks: [{
                    subscribe: subStub,
                    isCompleted: completeStub,
                    isSkipped: skipStub,
                    hasFailed: failStub
                }],
                spinner: {
                    succeed: sinon.stub(),
                    info: sinon.stub(),
                    fail: sinon.stub()
                }
            };

            rdr.subscribeToEvents.bind(ctx)();

            expect(subStub.calledOnce).to.be.true;
            // update values and execute callback
            subStub.firstCall.args[0].bind(ctx)({type: 'STATE'});

            expect(ctx.spinner.succeed.called).to.be.false;
            expect(ctx.spinner.info.called).to.be.true;
            expect(ctx.spinner.fail.called).to.be.false;

            done();
        });

        it('fail spinner called when task failed', function (done) {
            const subStub = sinon.stub();
            const completeStub = sinon.stub().returns(false);
            const skipStub = sinon.stub().returns(false);
            const failStub = sinon.stub().returns(true);
            const ctx = {
                tasks: [{
                    subscribe: subStub,
                    isCompleted: completeStub,
                    isSkipped: skipStub,
                    hasFailed: failStub
                }],
                spinner: {
                    succeed: sinon.stub(),
                    info: sinon.stub(),
                    fail: sinon.stub()
                }
            };

            rdr.subscribeToEvents.bind(ctx)();

            expect(subStub.calledOnce).to.be.true;
            // update values and execute callback
            subStub.firstCall.args[0].bind(ctx)({type: 'STATE'});

            expect(ctx.spinner.succeed.called).to.be.false;
            expect(ctx.spinner.info.called).to.be.false;
            expect(ctx.spinner.fail.called).to.be.true;

            done();
        });
    });

    describe('#frame', function () {
        let rdr;

        before(function () {
            rdr = new Renderer();
        });

        it('basic call works', function (done) {
            const ctx = {
                tasks: [
                    {isPending: sinon.stub().returns(false), name: '1'},
                    {isPending: sinon.stub().returns(true), name: '2'},
                    {isPending: sinon.stub().returns(false), name: '3'},
                    {isPending: sinon.stub().returns(false), name: '4'},
                    {isPending: sinon.stub().returns(true), name: '5'},
                    {isPending: sinon.stub().returns(true), name: '6'},
                    {isPending: sinon.stub().returns(false), name: '7'}
                ],
                spinner: {
                    start: sinon.stub(),
                    paused: false
                },
                previousFrame: '',
                buildText: sinon.stub().callsFake((res) => res.name)
            };

            rdr.frame.bind(ctx)();

            ctx.tasks.forEach(function (task) {
                expect(task.isPending.calledOnce).to.be.true;
            });
            expect(ctx.buildText.calledThrice).to.be.true;
            expect(ctx.spinner.start.calledOnce).to.be.true;
            expect(ctx.spinner.start.firstCall.args[0]).to.equal('2 | 5 | 6');

            done()
        });

        xit('spinner does nothing with no tasks', function (done) {
            const ctx = {
                tasks: [],
                spinner:{
                    paused: false,
                    start: sinon.stub()
                }
            };

            rdr.frame.bind(ctx)();

            expect(spinner.start.called).to.be.false;
            done();
        });

        it('spinner does nothing when text doesn\'t change', function (done) {
            const ctx = {
                tasks: [{
                    isPending: sinon.stub().returns(true),
                    name: 'a'
                }],
                spinner: {
                    paused: false,
                    spin: sinon.stub()
                },
                previousFrame: 'a',
                buildText: sinon.stub().callsFake((ret)=>ret.name)
            };

            rdr.frame.bind(ctx)();

            expect(ctx.tasks[0].isPending.calledOnce).to.be.true;
            expect(ctx.buildText.calledOnce).to.be.true;
            expect(ctx.spinner.spin.called).to.be.false;

            done();
        });

        it('spinner does nothing when paused', function (done) {
            const ctx = {
                tasks: [{
                    isPending: sinon.stub().returns(true),
                    name: 'a'
                }],
                spinner: {
                    paused: true,
                    spin: sinon.stub()
                },
                previousFrame: 'b',
                buildText: sinon.stub().callsFake((ret)=>ret.name)
            };

            rdr.frame.bind(ctx)();

            expect(ctx.tasks[0].isPending.calledOnce).to.be.true;
            expect(ctx.buildText.calledOnce).to.be.true;
            expect(ctx.spinner.spin.called).to.be.false;

            done();
        });
    });

    describe.only('#buildText', function () {
        let rdr;

        before(function () {
            rdr = new Renderer();
        });

        it('works when task has subtasks', function (done) {
            const task = {
                hasSubtasks: sinon.stub().returns(true),
                output: 'T-Rex',
                title: 'Dino'
            };

            const ret = rdr.buildText(task);
            console.log(ret);
            done();
        });

        it('works when subtasks don\'t output anything', function (done) {
            const task = {
                hasSubtasks: sinon.stub().returns(true),
                title: 'Dinos'
            };
            const ret = rdr.buildText(task);

            expect(ret).to.equal('Dinos');

            done();
        });
    });
});
