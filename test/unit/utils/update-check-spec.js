'use strict';
const expect = require('chai').expect;
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');
const stripAnsi = require('strip-ansi');

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

        const updateCheck = proxyquire(modulePath, {
            '../../package.json': pkg,
            'update-notifier': updateNotifer
        });

        return updateCheck({log: logStub}).then(() => {
            expect(logStub.called).to.be.false;
        });
    });

    it('doesn\'t log a message if the type of update is not major, minor, or patch', function () {
        const pkg = {name: 'ghost', version: '1.0.0'};
        const updateNotifer = sinon.stub().callsFake((options) => {
            expect(options).to.exist;
            expect(options.pkg).to.deep.equal(pkg);
            expect(options.callback).to.be.a('function');
            options.callback(null, {type: 'prerelease'});
        });
        const logStub = sinon.stub();

        const updateCheck = proxyquire(modulePath, {
            '../../package.json': pkg,
            'update-notifier': updateNotifer
        });

        return updateCheck({log: logStub}).then(() => {
            expect(logStub.called).to.be.false;
        });
    });

    it('logs a message if an update is available', function () {
        const pkg = {name: 'ghost', version: '1.0.0'};
        const updateNotifer = sinon.stub().callsFake((options) => {
            expect(options).to.exist;
            expect(options.pkg).to.deep.equal(pkg);
            expect(options.callback).to.be.a('function');
            options.callback(null, {type: 'minor'});
        });
        const logStub = sinon.stub();

        const updateCheck = proxyquire(modulePath, {
            '../../package.json': pkg,
            'update-notifier': updateNotifer
        });

        return updateCheck({log: logStub}).then(() => {
            expect(logStub.calledOnce).to.be.true;

            const log = logStub.args[0][0];

            expect(stripAnsi(log)).to.match(/You are running an outdated version of Ghost-CLI/);
        });
    });
});
