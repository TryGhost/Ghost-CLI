'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const errors = require('../../../../lib/errors');
const setupEnv = require('../../../utils/env');

const modulePath = '../../../../lib/commands/doctor/checks/startup';

describe('Unit: Commands > Startup Checks', function () {
    const sandbox = sinon.sandbox.create();

    afterEach(function () {
        sandbox.restore();
    });

    it('exports one task', function () {
        const startupChecks = require(modulePath);

        expect(startupChecks).to.be.an.instanceof(Array);
        expect(startupChecks).to.have.length(1);
        expect(startupChecks[0].title).to.match(/Validating config/);
        expect(startupChecks[0].task).to.be.an.instanceof(Function);
    });

    it('rejects if environment is passed and no config exists for that environment', function () {
        const env = setupEnv();
        const cwdStub = sandbox.stub(process, 'cwd').returns(env.dir);
        const startupChecks = require(modulePath);

        return startupChecks[0].task({environment: 'testing'}).then(() => {
            env.cleanup();
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.ConfigError);
            expect(error.message).to.match(/Config file is not valid JSON/);
            expect(error.options.environment).to.equal('testing');
            expect(cwdStub.calledOnce).to.be.true;

            env.cleanup();
        });
    });

    it('rejects if environment is passed and the config file is not valid json', function () {
        const env = setupEnv({files: [{path: 'config.testing.json', contents: 'not json'}]});
        const cwdStub = sandbox.stub(process, 'cwd').returns(env.dir);
        const startupChecks = require(modulePath);

        return startupChecks[0].task({environment: 'testing'}).then(() => {
            env.cleanup();
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.ConfigError);
            expect(error.message).to.match(/Config file is not valid JSON/);
            expect(error.options.environment).to.equal('testing');
            expect(cwdStub.calledOnce).to.be.true;

            env.cleanup();
        });
    });

    it('rejects if environment is not passed and folder is not a valid Ghost installation', function () {
        const checkValidInstallStub = sandbox.stub().throws({message: 'not a valid Ghost install'});
        const startupChecks = proxyquire(modulePath, {
            '../../../utils/check-valid-install': checkValidInstallStub
        });

        try {
            startupChecks[0].task({});
            expect(false, 'error should have been thrown').to.be.true;
        } catch (e) {
            expect(e.message).to.equal('not a valid Ghost install');
            expect(checkValidInstallStub.calledOnce).to.be.true;
            expect(checkValidInstallStub.calledWithExactly('doctor startup')).to.be.true;
        }
    });

    it('runs checkEnvironment and grabs environment from system if environment is not provided', function () {
        const env = setupEnv();
        const checkValidInstallStub = sandbox.stub();
        const checkEnvironmentStub = sandbox.stub();
        const getInstanceStub = sandbox.stub().returns({checkEnvironment: checkEnvironmentStub});
        sandbox.stub(process, 'cwd').returns(env.dir);

        const startupChecks = proxyquire(modulePath, {
            '../../../utils/check-valid-install': checkValidInstallStub
        });

        return startupChecks[0].task({system: {getInstance: getInstanceStub, environment: 'testing'}}).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.ConfigError);
            expect(error.message).to.match(/Config file is not valid JSON/);
            expect(error.options.environment).to.equal('testing');
            expect(checkValidInstallStub.calledOnce).to.be.true;
        });
    });

    it('rejects with error if config values does not pass', function () {
        const config = {server: {port: 2368}};
        const env = setupEnv({files: [{path: 'config.testing.json', content: config, json: true}]});
        const urlStub = sandbox.stub().returns('Invalid URL');
        const portStub = sandbox.stub().returns('Port is in use');
        const advancedOpts = {
            url: {
                // Test that validate isn't called when
                // value is not specified
                validate: urlStub
            },
            port: {
                // test that configPath is respected
                configPath: 'server.port',
                validate: portStub
            }
        };
        sandbox.stub(process, 'cwd').returns(env.dir);

        const startupChecks = proxyquire(modulePath, {
            '../../config/advanced': advancedOpts
        });

        return startupChecks[0].task({environment: 'testing'}).then(() => {
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
        const env = setupEnv({files: [{path: 'config.testing.json', content: config, json: true}]});
        const urlStub = sandbox.stub().returns(true);
        const portStub = sandbox.stub().returns(true);
        const advancedOpts = {
            url: {
                // Test that validate isn't called when
                // value is not specified
                validate: urlStub
            },
            port: {
                // test that configPath is respected
                configPath: 'server.port',
                validate: portStub
            }
        };
        sandbox.stub(process, 'cwd').returns(env.dir);

        const startupChecks = proxyquire(modulePath, {
            '../../config/advanced': advancedOpts
        });

        return startupChecks[0].task({environment: 'testing'}).then(() => {
            expect(urlStub.called).to.be.false;
            expect(portStub.calledOnce).to.be.true;
            expect(portStub.calledWithExactly(2368)).to.be.true;
        });
    });
});
