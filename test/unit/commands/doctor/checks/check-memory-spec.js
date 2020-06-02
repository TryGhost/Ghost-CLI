const expect = require('chai').expect;
const sinon = require('sinon');

const sysinfo = require('systeminformation');
const errors = require('../../../../../lib/errors');

const modulePath = '../../../../../lib/commands/doctor/checks/check-memory';

describe('Unit: Doctor Checks > Memory', function () {
    afterEach(() => {
        sinon.restore();
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

    it('uses systeminformation to determine memory availability', function () {
        const memStub = sinon.stub(sysinfo, 'mem').rejects(new Error('systeminformation'));
        const memCheck = require(modulePath);

        return memCheck.task().catch((error) => {
            expect(error).to.be.an('error');
            expect(error.message).to.equal('systeminformation');
            expect(memStub.calledOnce).to.be.true;
        });
    });

    it('fails if not enough memory is available', function () {
        const memStub = sinon.stub(sysinfo, 'mem').resolves({available: 10, swapfree: 0});
        const memCheck = require(modulePath);

        return memCheck.task().catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.match(/MB of memory available for smooth operation/);
            expect(memStub.calledOnce).to.be.true;
        });
    });

    it('passes if there is enough memory', function () {
        const memStub = sinon.stub(sysinfo, 'mem').resolves({available: 157286400, swapfree: 0});
        const memCheck = require(modulePath);

        return memCheck.task().then(() => {
            expect(memStub.calledOnce).to.be.true;
        });
    });

    it('passes if there is enough memory (using swap space)', function () {
        const memStub = sinon.stub(sysinfo, 'mem').resolves({available: 10, swapfree: 157286400});
        const memCheck = require(modulePath);

        return memCheck.task().then(() => {
            expect(memStub.calledOnce).to.be.true;
        });
    });
});
