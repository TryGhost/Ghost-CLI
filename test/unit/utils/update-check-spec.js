'use strict';
const expect = require('chai').expect;
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');
const stripAnsi = require('strip-ansi');
const errors = require('../../../lib/errors');

const modulePath = '../../../lib/utils/update-check';

describe('Unit: Utils > update-check', function () {
    it('rejects error if updateNotifier has an error', function (done) {
        const pkg = {name: 'ghost', version: '1.0.0'};
        const testError = new Error('update check');
        const updateNotifer = sinon.stub().callsFake((options) => {
            expect(options).to.exist;
            expect(options.pkg).to.deep.equal(pkg);
            expect(options.callback).to.be.a('function');
            options.callback(testError, null);
        });

        const updateCheck = proxyquire(modulePath, {
            '../../package.json': pkg,
            'update-notifier': updateNotifer
        });

        updateCheck().catch((err) => {
            expect(err.message).to.equal(testError.message);
            done();
        });
    });

    it('resolves immediately if there are no updates', function () {
        const pkg = {name: 'ghost', version: '1.0.0'};
        const updateNotifer = sinon.stub().callsFake((options) => {
            expect(options).to.exist;
            expect(options.pkg).to.deep.equal(pkg);
            expect(options.callback).to.be.a('function');
            options.callback(null, {type: 'latest'});
        });
        const logStub = sinon.stub();
        const promptStub = sinon.stub().resolves({yes: false});

        const updateCheck = proxyquire(modulePath, {
            '../../package.json': pkg,
            'update-notifier': updateNotifer
        });

        return updateCheck({log: logStub, prompt: promptStub}).then(() => {
            expect(logStub.called).to.be.false;
            expect(promptStub.called).to.be.false;
        });
    });

    it('prompts if an update is available, resolves if yes', function () {
        const pkg = {name: 'ghost', version: '1.0.0'};
        const updateNotifer = sinon.stub().callsFake((options) => {
            expect(options).to.exist;
            expect(options.pkg).to.deep.equal(pkg);
            expect(options.callback).to.be.a('function');
            options.callback(null, {type: 'minor'});
        });
        const logStub = sinon.stub();
        const promptStub = sinon.stub().resolves({yes: true});

        const updateCheck = proxyquire(modulePath, {
            '../../package.json': pkg,
            'update-notifier': updateNotifer
        });

        return updateCheck({log: logStub, prompt: promptStub}).then(() => {
            expect(logStub.calledOnce).to.be.true;
            expect(promptStub.calledOnce).to.be.true;

            const log = logStub.args[0][0];
            const prompt = promptStub.args[0][0];

            expect(stripAnsi(log)).to.match(/You are running an outdated version of Ghost-CLI/);
            expect(prompt).to.exist;
            expect(prompt.type).to.equal('confirm');
            expect(prompt.default).to.be.false;
        });
    });

    it('prompts if an update is available, rejects if no', function (done) {
        const pkg = {name: 'ghost', version: '1.0.0'};
        const updateNotifer = sinon.stub().callsFake((options) => {
            expect(options).to.exist;
            expect(options.pkg).to.deep.equal(pkg);
            expect(options.callback).to.be.a('function');
            options.callback(null, {type: 'minor'});
        });
        const logStub = sinon.stub();
        const promptStub = sinon.stub().resolves({yes: false});

        const updateCheck = proxyquire(modulePath, {
            '../../package.json': pkg,
            'update-notifier': updateNotifer
        });

        updateCheck({log: logStub, prompt: promptStub}).then(() => {
            done(new Error('updateCheck should not have resolved'));
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.equal('Ghost-CLI version is out-of-date');
            expect(logStub.calledOnce).to.be.true;
            expect(promptStub.calledOnce).to.be.true;

            const log = logStub.args[0][0];
            const prompt = promptStub.args[0][0];

            expect(stripAnsi(log)).to.match(/You are running an outdated version of Ghost-CLI/);
            expect(prompt).to.exist;
            expect(prompt.type).to.equal('confirm');
            expect(prompt.default).to.be.false;
            done();
        });
    });
});
