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
});
