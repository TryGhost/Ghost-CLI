const {expect} = require('chai');
const sinon = require('sinon');
const semver = require('semver');

const {SystemError} = require('../../../../../lib/errors');
const check = require('../../../../../lib/commands/doctor/checks/binary-deps');

describe('Unit: Doctor Checks > Binary Deps', function () {
    afterEach(() => {
        sinon.restore();
    });

    it('exports proper task', function () {
        expect(check.title).to.equal('Checking binary dependencies');
        expect(check.task).to.be.a('function');
        expect(check.category).to.deep.equal(['start']);
    });

    it('skips if instance not set', function () {
        const skip = sinon.stub();

        check.task({}, {skip});
        expect(skip.calledOnce).to.be.true;
    });

    it('does nothing if node versions are the same', function () {
        const skip = sinon.stub();
        const instance = {nodeVersion: process.versions.node};

        check.task({instance}, {skip});
        expect(skip.called).to.be.false;
    });

    it('throws error if node versions are different', function () {
        const skip = sinon.stub();
        const instance = {nodeVersion: semver.inc(process.versions.node, 'major')};

        try {
            check.task({instance}, {skip});
        } catch (error) {
            expect(error).to.be.an.instanceof(SystemError);
            expect(error.message).to.include('node version has changed');
            expect(skip.called).to.be.false;
            return;
        }

        expect.fail('should have thrown an error');
    });
});
