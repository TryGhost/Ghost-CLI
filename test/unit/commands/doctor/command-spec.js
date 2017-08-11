'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const modulePath = '../../../../lib/commands/doctor/index';
const errors = require('../../../../lib/errors');

describe('Unit: Commands > Doctor', function () {
    it('defaults to running install checks if no check is supplied', function () {
        const listrStub = sinon.stub().resolves();
        const successStub = sinon.stub();
        const ui = {listr: listrStub, success: successStub};

        const DoctorCommand = proxyquire(modulePath, {
            './checks/install': {installChecks: true}
        });
        const instance = new DoctorCommand(ui, {system: true});

        return instance.run({}).then(() => {
            expect(listrStub.calledOnce).to.be.true;
            expect(listrStub.args[0][0]).to.deep.equal({installChecks: true});
            expect(listrStub.args[0][1]).to.deep.equal({
                ui: ui,
                system: {system: true}
            });
            expect(successStub.calledOnce).to.be.true;
            expect(successStub.args[0][0]).to.match(/checks passed/);
        });
    });

    it('rejects if checks category not found', function () {
        const failStub = sinon.stub();
        const DoctorCommand = require(modulePath);
        const instance = new DoctorCommand({fail: failStub}, {system: true});

        return instance.run({category: 'nonexistent'}).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.not.exist;
            expect(failStub.calledOnce).to.be.true;
            expect(failStub.args[0][0]).to.match(/Invalid category/);
        });
    });

    it('logs message if a doctor check fails with a SystemError', function () {
        const listrStub = sinon.stub().rejects(new errors.SystemError({message: 'aaaahhhh'}));
        const logStub = sinon.stub();
        const DoctorCommand = require(modulePath);
        const instance = new DoctorCommand({listr: listrStub, log: logStub});

        return instance.run({}).then(() => {
            expect(listrStub.calledOnce).to.be.true;
            expect(logStub.calledTwice).to.be.true;
            expect(logStub.args[0][0]).to.match(/Checks failed/);
            expect(logStub.args[1][0]).to.match(/aaaahhhh/);
        });
    });

    it('rejects if rejected error is not a system error', function () {
        const listrStub = sinon.stub().rejects(new Error('aaaahhhh'));
        const DoctorCommand = require(modulePath);
        const instance = new DoctorCommand({listr: listrStub});

        return instance.run({}).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(Error);
            expect(error.message).to.equal('aaaahhhh');
        });
    });
});
