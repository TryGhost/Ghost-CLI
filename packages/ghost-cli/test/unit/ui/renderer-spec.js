'use strict';
const {expect} = require('chai');
const sinon = require('sinon');
const stripAnsi = require('strip-ansi');

const createRenderer = require('../../../lib/ui/renderer');
const {Renderer} = createRenderer;

describe('Unit: UI > Renderer', function () {
    it('can be created successfully, filters tasks', function () {
        const tasks = [{
            isEnabled: () => false,
            name: 'a'
        }, {
            isEnabled: () => true,
            name: 'b'
        }];

        const rdr = new Renderer({ui: true}, tasks);

        expect(rdr).to.be.ok;
        expect(rdr.ui).to.deep.equal({ui: true});
        expect(rdr.tasks).to.have.length(1);
        expect(rdr.tasks[0].name).to.equal('b');
    });

    it('createRenderer creates a subclass correctly', function () {
        const RendererSubclass = createRenderer({uiObject: true});
        const isEnabled = () => true;

        expect(RendererSubclass.prototype).to.be.an.instanceof(Renderer);

        const renderer = new RendererSubclass([{task: true, isEnabled}]);

        expect(renderer.ui).to.deep.equal({uiObject: true});
        expect(renderer.tasks).to.deep.equal([{task: true, isEnabled}]);
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
        const isEnabled = () => true;

        it('calls subscribe on every task', function () {
            const tasks = [
                {subscribe: sinon.stub(), isEnabled},
                {subscribe: sinon.stub(), isEnabled}
            ];

            const renderer = new Renderer({}, tasks);
            renderer.subscribeToEvents();

            expect(tasks[0].subscribe.calledOnce).to.be.true;
            expect(tasks[1].subscribe.calledOnce).to.be.true;
        });

        it('callback does nothing when event is not state', function () {
            const subStub = sinon.stub();
            const renderer = new Renderer({}, [{subscribe: subStub, isEnabled}]);
            const spinner = {
                succeed: sinon.stub(),
                info: sinon.stub(),
                fail: sinon.stub()
            };

            renderer.spinner = spinner;
            renderer.subscribeToEvents();

            expect(subStub.calledOnce).to.be.true;

            // execute the callback
            subStub.firstCall.args[0]({type: 'EVENT'});

            expect(spinner.succeed.called).to.be.false;
            expect(spinner.info.called).to.be.false;
            expect(spinner.fail.called).to.be.false;
        });

        it('succeed spinner called when task completes', function () {
            const subStub = sinon.stub();
            const renderer = new Renderer({}, [{
                subscribe: subStub,
                isCompleted: () => true,
                isSkipped: () => false,
                hasFailed: () => false,
                isEnabled
            }]);

            const spinner = {
                succeed: sinon.stub(),
                info: sinon.stub(),
                fail: sinon.stub()
            };
            renderer.spinner = spinner;
            renderer.subscribeToEvents();

            expect(subStub.calledOnce).to.be.true;
            // update values and execute callback
            subStub.firstCall.args[0]({type: 'STATE'});

            expect(spinner.succeed.called).to.be.true;
            expect(spinner.info.called).to.be.false;
            expect(spinner.fail.called).to.be.false;
        });

        it('stop spinner called when task completes and clearOnSuccess is true', function () {
            const subStub = sinon.stub();
            const renderer = new Renderer({}, [{
                subscribe: subStub,
                isCompleted: () => true,
                isSkipped: () => false,
                hasFailed: () => false,
                isEnabled
            }], {clearOnSuccess: true});

            const spinner = {
                succeed: sinon.stub(),
                stop: sinon.stub(),
                info: sinon.stub(),
                fail: sinon.stub()
            };
            renderer.spinner = spinner;
            renderer.subscribeToEvents();

            expect(subStub.calledOnce).to.be.true;
            // update values and execute callback
            subStub.firstCall.args[0]({type: 'STATE'});

            expect(spinner.stop.calledOnce).to.be.true;
            expect(spinner.succeed.called).to.be.false;
            expect(spinner.info.called).to.be.false;
            expect(spinner.fail.called).to.be.false;
        });

        it('info spinner called when task skips', function () {
            const subStub = sinon.stub();
            const renderer = new Renderer({}, [{
                subscribe: subStub,
                isCompleted: () => false,
                isSkipped: () => true,
                hasFailed: () => false,
                isEnabled
            }]);

            const spinner = {
                succeed: sinon.stub(),
                info: sinon.stub(),
                fail: sinon.stub()
            };
            renderer.spinner = spinner;
            renderer.subscribeToEvents();

            expect(subStub.calledOnce).to.be.true;
            // update values and execute callback
            subStub.firstCall.args[0]({type: 'STATE'});

            expect(spinner.succeed.called).to.be.false;
            expect(spinner.info.called).to.be.true;
            expect(spinner.fail.called).to.be.false;
        });

        it('info spinner called when task skips, logs task output', function () {
            const subStub = sinon.stub();
            const log = sinon.stub();
            const renderer = new Renderer({log}, [{
                subscribe: subStub,
                isCompleted: () => false,
                isSkipped: () => true,
                hasFailed: () => false,
                output: 'test output',
                isEnabled
            }]);

            const spinner = {
                succeed: sinon.stub(),
                info: sinon.stub(),
                fail: sinon.stub()
            };
            renderer.spinner = spinner;
            renderer.subscribeToEvents();

            expect(subStub.calledOnce).to.be.true;
            // update values and execute callback
            subStub.firstCall.args[0]({type: 'STATE'});

            expect(spinner.succeed.called).to.be.false;
            expect(spinner.info.called).to.be.true;
            expect(spinner.fail.called).to.be.false;
            expect(log.calledOnce).to.be.true;
            expect(log.calledWithExactly('test output'));
        });

        it('fail spinner called when task failed', function () {
            const subStub = sinon.stub();
            const renderer = new Renderer({}, [{
                subscribe: subStub,
                isCompleted: () => false,
                isSkipped: () => false,
                hasFailed: () => true,
                isEnabled
            }]);

            const spinner = {
                succeed: sinon.stub(),
                info: sinon.stub(),
                fail: sinon.stub()
            };
            renderer.spinner = spinner;
            renderer.subscribeToEvents();

            expect(subStub.calledOnce).to.be.true;
            // update values and execute callback
            subStub.firstCall.args[0]({type: 'STATE'});

            expect(spinner.succeed.called).to.be.false;
            expect(spinner.info.called).to.be.false;
            expect(spinner.fail.called).to.be.true;
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
