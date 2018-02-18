'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');

const os = require('os');
const errors = require('../../../../../lib/errors');

const modulePath = '../../../../../lib/commands/doctor/checks/check-memory';

describe('Unit: Doctor Checks > Memory', function () {
    const sandbox = sinon.sandbox.create();

    afterEach(() => {
        sandbox.restore();
    });

    it('exports proper task', function () {
        const checkMem = require(modulePath);

        expect(checkMem.title).to.equal('Checking memory availability');
        expect(checkMem.task).to.be.a('function');
        expect(checkMem.enabled).to.a('function');
        expect(checkMem.category).to.deep.equal(['install', 'start', 'update']);
    });

    it('enabled is determined by check-mem argument', function () {
        const memCheck = require(modulePath);
        const ctx = {
            argv: {'check-mem': false}
        };

        expect(memCheck.enabled(ctx)).to.be.false;
        ctx.argv['check-mem'] = true;
        expect(memCheck.enabled(ctx)).to.be.true;
    });

    it('fails if not enough memory is available', function () {
        const osStub = sandbox.stub(os, 'freemem').returns(10);
        const memCheck = require(modulePath);
        const ctx = {
            argv: {'check-mem': true}
        };

        return memCheck.task(ctx).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.match(/MB of memory available for smooth operation/);
            expect(osStub.calledOnce).to.be.true;
        });
    });

    it('passes if there is enough memory', function () {
        const osStub = sandbox.stub(os, 'freemem').returns(157286400);
        const memCheck = require(modulePath);
        const ctx = {
            argv: {'check-mem': true}
        };

        return memCheck.task(ctx).then(() => {
            expect(osStub.calledOnce).to.be.true;
        });
    });
});
