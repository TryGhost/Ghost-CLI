'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');

const errors = require('../../../../../lib/errors');
const {setupTestFolder, cleanupTestFolders} = require('../../../../utils/test-folder');
const advancedOpts = require('../../../../../lib/tasks/configure/options');

const check = require('../../../../../lib/commands/doctor/checks/validate-config');
const validateConfig = check.task;

describe('Unit: Doctor Checks > validateConfig', function () {
    afterEach(function () {
        sinon.restore();
    });

    after(() => {
        cleanupTestFolders();
    });

    it('skips if instance not set', function () {
        const skipStub = sinon.stub();

        validateConfig({instance: null}, {skip: skipStub});
        expect(skipStub.calledOnce).to.be.true;
    });

    it('skips check, when instance is currently running', function () {
        const runningStub = sinon.stub().resolves(true);
        const skipStub = sinon.stub();

        return validateConfig({instance: {isRunning: runningStub}}, {skip: skipStub}).then(() => {
            expect(runningStub.calledOnce).to.be.true;
            expect(skipStub.calledOnce).to.be.true;
        });
    });

    it('rejects if environment is passed and no config exists for that environment', function () {
        const env = setupTestFolder();
        const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);
        const runningStub = sinon.stub().resolves(false);

        return validateConfig({
            system: {environment: 'testing'},
            instance: {isRunning: runningStub}
        }).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.ConfigError);
            expect(error.message).to.match(/Config file is not valid JSON/);
            expect(error.options.environment).to.equal('testing');
            expect(cwdStub.calledOnce).to.be.true;
            expect(runningStub.calledOnce).to.be.true;
        });
    });

    it('rejects if environment is passed and the config file is not valid json', function () {
        const env = setupTestFolder({files: [{path: 'config.testing.json', content: 'not json'}]});
        const cwdStub = sinon.stub(process, 'cwd').returns(env.dir);
        const runningStub = sinon.stub().resolves(false);

        return validateConfig({
            system: {environment: 'testing'},
            instance: {isRunning: runningStub}
        }).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.ConfigError);
            expect(error.message).to.match(/Config file is not valid JSON/);
            expect(error.options.environment).to.equal('testing');
            expect(cwdStub.calledOnce).to.be.true;
            expect(runningStub.calledOnce).to.be.true;
        });
    });

    it('rejects with error if config values does not pass', function () {
        const config = {server: {port: 2368}};
        const env = setupTestFolder({files: [{path: 'config.testing.json', content: config, json: true}]});
        const urlStub = sinon.stub(advancedOpts.url, 'validate').returns('Invalid URL');
        const portStub = sinon.stub(advancedOpts.port, 'validate').returns('Port is in use');
        sinon.stub(process, 'cwd').returns(env.dir);
        const runningStub = sinon.stub().resolves(false);

        return validateConfig({
            system: {environment: 'testing'},
            instance: {isRunning: runningStub}
        }).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.ConfigError);
            expect(error.message).to.equal('Port is in use');
            expect(error.options.config).to.deep.equal({'server.port': 2368});
            expect(urlStub.called).to.be.false;
            expect(portStub.calledOnce).to.be.true;
            expect(portStub.calledWithExactly(2368)).to.be.true;
        });
    });

    it('passes if all validate functions return true', function () {
        const config = {server: {port: 2368}};
        const env = setupTestFolder({files: [{path: 'config.testing.json', content: config, json: true}]});
        const urlStub = sinon.stub(advancedOpts.url, 'validate').returns(true);
        const portStub = sinon.stub(advancedOpts.port, 'validate').returns(true);
        sinon.stub(process, 'cwd').returns(env.dir);
        const runningStub = sinon.stub().resolves(false);

        return validateConfig({
            system: {environment: 'testing'},
            instance: {isRunning: runningStub}
        }).then(() => {
            expect(urlStub.called).to.be.false;
            expect(portStub.calledOnce).to.be.true;
            expect(portStub.calledWithExactly(2368)).to.be.true;
        });
    });
});
