const {expect} = require('chai');
const sinon = require('sinon');

const sysinfo = require('systeminformation');
const {SystemError} = require('../../../../../lib/errors');

const check = require('../../../../../lib/commands/doctor/checks/free-space');

describe('Unit: Doctor Checks > Free Space', function () {
    afterEach(() => {
        sinon.restore();
    });

    it('exports proper task', function () {
        expect(check.title).to.equal('Checking free space');
        expect(check.task).to.be.a('function');
        expect(check.category).to.deep.equal(['install', 'update']);
    });

    it('handles error from systeminformation', function () {
        const stub = sinon.stub(sysinfo, 'fsSize').rejects(new Error('test-error'));
        const cwdStub = sinon.stub(process, 'cwd').returns('/test/directory');

        return check.task({}).catch((error) => {
            expect(error).to.be.an('error');
            expect(error.message).to.equal('test-error');
            expect(stub.calledOnce).to.be.true;
            expect(cwdStub.calledOnce).to.be.true;
        });
    });

    it('handles error from systeminformation', function () {
        const stub = sinon.stub(sysinfo, 'fsSize').rejects(new Error('test-error'));
        const cwdStub = sinon.stub(process, 'cwd').returns('/test/directory');

        return check.task({}).catch((error) => {
            expect(error).to.be.an('error');
            expect(error.message).to.equal('test-error');
            expect(stub.calledOnce).to.be.true;
            expect(cwdStub.calledOnce).to.be.true;
        });
    });

    it('does nothing if no matching mount points found', async function () {
        const stub = sinon.stub(sysinfo, 'fsSize').resolves([{
            mount: '/not/matching/dir',
            size: 0,
            used: 0
        }]);
        const cwdStub = sinon.stub(process, 'cwd').returns('/not/matching/dir');

        await check.task({instance: {dir: '/test/dir'}});
        expect(stub.calledOnce).to.be.true;
        expect(cwdStub.called).to.be.false;
    });

    it('errors if not enough space available', function () {
        const stub = sinon.stub(sysinfo, 'fsSize').resolves([{
            mount: '/',
            size: 1000000000000,
            used: 1000000000
        }, {
            mount: '/test/dir',
            size: 0,
            used: 0
        }]);
        const cwdStub = sinon.stub(process, 'cwd').returns('/test/dir');

        return check.task({}).catch((error) => {
            expect(error).to.be.an.instanceOf(SystemError);
            expect(stub.calledOnce).to.be.true;
            expect(cwdStub.calledOnce).to.be.true;
        });
    });

    it('succeeds if enough space available', async function () {
        const stub = sinon.stub(sysinfo, 'fsSize').resolves([{
            mount: '/',
            size: 1000000000000,
            used: 1000000000
        }, {
            mount: '/test/dir',
            size: 0,
            used: 0
        }]);
        const cwdStub = sinon.stub(process, 'cwd').returns('/test/dir');

        await check.task({instance: {dir: '/'}});
        expect(stub.calledOnce).to.be.true;
        expect(cwdStub.called).to.be.false;
    });
});
