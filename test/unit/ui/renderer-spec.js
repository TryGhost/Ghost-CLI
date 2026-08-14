'use strict';
const {expect} = require('chai');
const sinon = require('sinon');
const {stripVTControlCharacters: stripAnsi} = require('util');

const createRenderer = require('../../../lib/ui/renderer');
const {Renderer} = createRenderer;

describe('Unit: UI > Renderer', function () {
    it('can be created successfully', function () {
        const tasks = [{name: 'a'}, {name: 'b'}];

        const rdr = new Renderer({ui: true}, tasks);

        expect(rdr).to.be.ok;
        expect(rdr.ui).to.deep.equal({ui: true});
        expect(rdr.tasks).to.deep.equal(tasks);
    });

    it('is not supported in non-tty environments', function () {
        expect(Renderer.nonTTY).to.be.false;
        expect(createRenderer({}).nonTTY).to.be.false;
    });

    it('createRenderer creates a subclass correctly', function () {
        const RendererSubclass = createRenderer({uiObject: true});

        expect(RendererSubclass.prototype).to.be.an.instanceof(Renderer);

        const renderer = new RendererSubclass([{task: true}]);

        expect(renderer.ui).to.deep.equal({uiObject: true});
        expect(renderer.tasks).to.deep.equal([{task: true}]);
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
                ui: {
                    stdout: {}
                },
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
        const flush = () => new Promise((resolve) => {
            queueMicrotask(resolve);
        });

        const makeTask = (state = {}) => ({
            on: sinon.stub(),
            title: 'Test task',
            message: {},
            isCompleted: () => false,
            isSkipped: () => false,
            hasFailed: () => false,
            ...state
        });

        const makeSpinner = () => ({
            succeed: sinon.stub(),
            stop: sinon.stub(),
            info: sinon.stub(),
            fail: sinon.stub()
        });

        it('subscribes to state events on every task', function () {
            const tasks = [makeTask(), makeTask()];

            const renderer = new Renderer({}, tasks);
            renderer.subscribeToEvents();

            expect(tasks[0].on.calledOnce).to.be.true;
            expect(tasks[0].on.firstCall.args[0]).to.equal('STATE');
            expect(tasks[1].on.calledOnce).to.be.true;
            expect(tasks[1].on.firstCall.args[0]).to.equal('STATE');
        });

        it('callback does nothing when the task is still running', function () {
            const task = makeTask();
            const renderer = new Renderer({}, [task]);
            const spinner = makeSpinner();

            renderer.spinner = spinner;
            renderer.subscribeToEvents();

            // execute the callback
            task.on.firstCall.args[1]();

            expect(spinner.succeed.called).to.be.false;
            expect(spinner.info.called).to.be.false;
            expect(spinner.fail.called).to.be.false;
        });

        it('succeed spinner called when task completes', function () {
            const task = makeTask({isCompleted: () => true});
            const renderer = new Renderer({}, [task]);
            const spinner = makeSpinner();

            renderer.spinner = spinner;
            renderer.subscribeToEvents();
            task.on.firstCall.args[1]();

            expect(spinner.succeed.calledWithExactly('Test task')).to.be.true;
            expect(spinner.info.called).to.be.false;
            expect(spinner.fail.called).to.be.false;
        });

        it('stop spinner called when task completes and clearOnSuccess is true', function () {
            const task = makeTask({isCompleted: () => true});
            const renderer = new Renderer({}, [task], {clearOnSuccess: true});
            const spinner = makeSpinner();

            renderer.spinner = spinner;
            renderer.subscribeToEvents();
            task.on.firstCall.args[1]();

            expect(spinner.stop.calledOnce).to.be.true;
            expect(spinner.succeed.called).to.be.false;
            expect(spinner.info.called).to.be.false;
            expect(spinner.fail.called).to.be.false;
        });

        it('info spinner called when task skips', async function () {
            const log = sinon.stub();
            const task = makeTask({isSkipped: () => true});
            const renderer = new Renderer({log}, [task]);
            const spinner = makeSpinner();

            renderer.spinner = spinner;
            renderer.subscribeToEvents();
            task.on.firstCall.args[1]();
            await flush();

            expect(spinner.succeed.called).to.be.false;
            expect(spinner.info.calledOnce).to.be.true;
            expect(stripAnsi(spinner.info.firstCall.args[0])).to.equal('Test task [skipped]');
            expect(spinner.fail.called).to.be.false;
            expect(log.called).to.be.false;
        });

        it('info spinner called when task skips, logs the skip message', async function () {
            const log = sinon.stub();
            const task = makeTask({isSkipped: () => true, message: {skip: 'test output'}});
            const renderer = new Renderer({log}, [task]);
            const spinner = makeSpinner();

            renderer.spinner = spinner;
            renderer.subscribeToEvents();
            task.on.firstCall.args[1]();
            await flush();

            expect(spinner.succeed.called).to.be.false;
            expect(spinner.info.calledOnce).to.be.true;
            expect(spinner.fail.called).to.be.false;
            expect(log.calledOnce).to.be.true;
            expect(log.calledWithExactly('test output', 'yellow')).to.be.true;
        });

        it('doesn\'t log the skip message when it\'s just the task title', async function () {
            const log = sinon.stub();
            const task = makeTask({isSkipped: () => true, message: {skip: 'Test task'}});
            const renderer = new Renderer({log}, [task]);
            const spinner = makeSpinner();

            renderer.spinner = spinner;
            renderer.subscribeToEvents();
            task.on.firstCall.args[1]();
            await flush();

            expect(spinner.info.calledOnce).to.be.true;
            expect(log.called).to.be.false;
        });

        it('fail spinner called when task failed', function () {
            const task = makeTask({hasFailed: () => true});
            const renderer = new Renderer({}, [task]);
            const spinner = makeSpinner();

            renderer.spinner = spinner;
            renderer.subscribeToEvents();
            task.on.firstCall.args[1]();

            expect(spinner.succeed.called).to.be.false;
            expect(spinner.info.called).to.be.false;
            expect(spinner.fail.calledWithExactly('Test task')).to.be.true;
        });
    });

    describe('#frame', function () {
        const isEnabled = () => true;

        it('basic call works', function () {
            const renderer = new Renderer({}, [
                {isPending: sinon.stub().returns(false), name: '1', isEnabled},
                {isPending: sinon.stub().returns(true), name: '2', isEnabled},
                {isPending: sinon.stub().returns(false), name: '3', isEnabled},
                {isPending: sinon.stub().returns(false), name: '4', isEnabled},
                {isPending: sinon.stub().returns(true), name: '5', isEnabled},
                {isPending: sinon.stub().returns(true), name: '6', isEnabled},
                {isPending: sinon.stub().returns(false), name: '7', isEnabled}
            ]);
            const start = sinon.stub();
            const buildText = sinon.stub(renderer, 'buildText').callsFake(({name}) => name);

            renderer.previousFrame = '';
            renderer.spinner = {start, paused: false};

            renderer.frame();
            renderer.tasks.forEach(({isPending}) => {
                expect(isPending.calledOnce).to.be.true;
            });

            expect(buildText.calledThrice).to.be.true;
            expect(start.calledOnce).to.be.true;
            expect(start.firstCall.args[0]).to.equal('2 | 5 | 6');
        });

        it('spinner does nothing with no tasks', function () {
            const renderer = new Renderer({}, []);
            const start = sinon.stub();
            const buildText = sinon.stub(renderer, 'buildText').callsFake(({name}) => name);

            renderer.spinner = {start, paused: false};
            renderer.frame();

            expect(start.called).to.be.false;
            expect(buildText.called).to.be.false;
        });

        it('spinner does nothing when text doesn\'t change', function () {
            const tasks = [{
                isPending: sinon.stub().returns(true),
                name: 'a',
                isEnabled
            }];
            const renderer = new Renderer({}, tasks);
            const spin = sinon.stub();
            const buildText = sinon.stub(renderer, 'buildText').callsFake(({name}) => name);

            renderer.spinner = {spin, paused: false};
            renderer.previousFrame = 'a';
            renderer.frame();

            expect(tasks[0].isPending.calledOnce).to.be.true;
            expect(buildText.calledOnce).to.be.true;
            expect(spin.called).to.be.false;
        });

        it('spinner does nothing when paused', function () {
            const tasks = [{
                isPending: sinon.stub().returns(true),
                name: 'b',
                isEnabled
            }];
            const renderer = new Renderer({}, tasks);
            const spin = sinon.stub();
            const buildText = sinon.stub(renderer, 'buildText').callsFake(({name}) => name);

            renderer.spinner = {spin, paused: true};
            renderer.previousFrame = 'a';
            renderer.frame();

            expect(tasks[0].isPending.calledOnce).to.be.true;
            expect(buildText.calledOnce).to.be.true;
            expect(spin.called).to.be.false;
        });
    });

    describe('#buildText', function () {
        const renderer = new Renderer();

        it('no subtasks, yes output', function () {
            const task = {
                hasSubtasks: sinon.stub().returns(false),
                output: '     my \n name \n is \n not \n important \n   ',
                title: 'Dino'
            };

            const ret = renderer.buildText(task);

            expect(task.hasSubtasks.calledOnce).to.be.true;
            expect(stripAnsi(ret)).to.equal('Dino >  important');
        });

        it('no subtasks, no output', function () {
            const task = {
                hasSubtasks: sinon.stub().returns(false),
                title: 'Dinos'
            };

            const ret = renderer.buildText(task);

            expect(task.hasSubtasks.calledOnce).to.be.true;
            expect(ret).to.equal('Dinos');
        });

        it('handles subtasks', function () {
            const task = {
                hasSubtasks: sinon.stub().returns(true),
                subtasks: [{
                    isPending: sinon.stub().returns(true),
                    hasSubtasks: sinon.stub().returns(false),
                    title: 'Pig'
                }, {
                    isPending: sinon.stub().returns(false),
                    hasSubtasks: sinon.stub().returns(false),
                    title: 'Cow'
                }],
                title: 'Animal'
            };

            const ret = renderer.buildText(task);

            expect(task.hasSubtasks.calledOnce).to.be.true;
            expect(task.subtasks[0].isPending.calledOnce).to.be.true;
            expect(task.subtasks[0].hasSubtasks.calledOnce).to.be.true;
            expect(task.subtasks[1].isPending.calledOnce).to.be.true;
            expect(task.subtasks[1].hasSubtasks.called).to.be.false;
            expect(stripAnsi(ret)).to.equal('Animal > Pig');
        });
    });

    describe('#end', function () {
        afterEach(() => {
            sinon.restore();
        });

        it('clears its interval', function () {
            const renderer = new Renderer();
            renderer.id = 100;
            const clrStub = sinon.stub(global, 'clearInterval');

            renderer.end();

            expect(renderer.id).to.be.undefined;
            expect(clrStub.called).to.be.true;
            expect(clrStub.firstCall.args[0]).to.equal(100);
        });

        it('doesn\'t clear nonexistant ids', function () {
            const renderer = new Renderer();
            const clrStub = sinon.stub(global, 'clearInterval');

            renderer.end();

            expect(clrStub.called).to.be.false;
        });

        it('removes spinner', function () {
            const renderer = new Renderer({spinner: true});
            const stop = sinon.stub();

            renderer.spinner = {stop};
            renderer.end();

            expect(stop.calledOnce).to.be.true;
            expect(renderer.spinner).to.be.null;
            expect(renderer.ui.spinner).to.be.null;
        });
    });
});
