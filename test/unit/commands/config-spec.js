'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const Promise = require('bluebird');
const proxyquire = require('proxyquire').noCallThru();

const Config = require('../../../lib/utils/config');
const errors = require('../../../lib/errors');

const modulePath = '../../../lib/commands/config';
const advancedModulePath = '../../../lib/commands/config/advanced';

describe('Unit: Command > Config', function () {
    it('constructs instance', function () {
        let instanceStub = sinon.stub().returns({ instance: true });
        let ConfigCommand = require(modulePath);

        let config = new ConfigCommand({}, { getInstance: instanceStub });

        expect(instanceStub.calledOnce).to.be.true;
        expect(config.instance).to.deep.equal({ instance: true });
    });

    describe('handleAdvancedOptions', function () {
        it('sets config url to new port if port is different then what url is set to', function () {
            let ConfigCommand = proxyquire(modulePath, { './advanced': {} });
            let instanceConfig = new Config('config.json');
            let saveStub = sinon.stub(instanceConfig, 'save');
            let getInstanceStub = sinon.stub().returns({ config: instanceConfig });
            let config = new ConfigCommand({}, { getInstance: getInstanceStub });

            instanceConfig.set('url', 'http://localhost:2368');
            instanceConfig.set('server.port', 2369);

            return config.handleAdvancedOptions().then(() => {
                expect(instanceConfig.get('url')).to.equal('http://localhost:2369/');
                expect(instanceConfig.get('server.port')).to.equal(2369);
                expect(saveStub.calledOnce).to.be.true;
            });
        });

        it('does not change port if port not defined', function () {
            let ConfigCommand = proxyquire(modulePath, { './advanced': {} });
            let instanceConfig = new Config('config.json');
            let saveStub = sinon.stub(instanceConfig, 'save');
            let getInstanceStub = sinon.stub().returns({ config: instanceConfig });
            let config = new ConfigCommand({}, { getInstance: getInstanceStub });

            instanceConfig.set('url', 'http://localhost:2368');

            return config.handleAdvancedOptions().then(() => {
                expect(instanceConfig.get('url')).to.equal('http://localhost:2368');
                expect(instanceConfig.get('server.port', null)).to.equal(null);
                expect(saveStub.calledOnce).to.be.true;
            });
        });

        it('handles nonexistent values correctly', function () {
            let ConfigCommand = proxyquire(modulePath, { './advanced': {
                url: {
                    defaultValue: 'http://localhost:2368'
                },
                port: {
                    configPath: 'server.port'
                },
                log: {
                    configPath: 'logging.transports',
                    defaultValue() {
                        return Promise.resolve(['file', 'stdout']);
                    }
                }
            } });
            let instanceConfig = new Config('config.json');
            let saveStub = sinon.stub(instanceConfig, 'save');
            let getInstanceStub = sinon.stub().returns({ config: instanceConfig });
            let config = new ConfigCommand({}, { getInstance: getInstanceStub });

            return config.handleAdvancedOptions({log: []}).then(() => {
                expect(instanceConfig.get('url')).to.equal('http://localhost:2368');
                expect(instanceConfig.get('server.port')).to.be.undefined;
                expect(instanceConfig.get('logging.transports')).to.deep.equal(['file', 'stdout']);
                expect(saveStub.calledOnce).to.be.true;
            });
        });

        it('runs the transform function if one is set', function () {
            let ConfigCommand = proxyquire(modulePath, { './advanced': {
                url: {
                    transform: value => value.toLowerCase()
                }
            } });
            let instanceConfig = new Config('config.json');
            let saveStub = sinon.stub(instanceConfig, 'save');
            let getInstanceStub = sinon.stub().returns({ config: instanceConfig });
            let config = new ConfigCommand({}, { getInstance: getInstanceStub });

            return config.handleAdvancedOptions({ url: 'http://MyWebsite.com' }).then(() => {
                expect(instanceConfig.get('url')).to.equal('http://mywebsite.com');
                expect(saveStub.calledOnce).to.be.true;
            });
        });

        it('throws config error if validate function is defined and doesn\'t return true', function () {
            let ConfigCommand = proxyquire(modulePath, { './advanced': {
                url: {
                    validate: () => 'invalid url'
                }
            } });
            let instanceConfig = new Config('config.json');
            let getInstanceStub = sinon.stub().returns({ config: instanceConfig });
            let config = new ConfigCommand({}, { getInstance: getInstanceStub });

            return config.handleAdvancedOptions({ url: 'http://localhost:2368' }).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.ConfigError);
                expect(error.options.config).to.deep.equal({url: 'http://localhost:2368'});
            });
        });
    });

    describe('getConfigPrompts', function () {
        let ConfigCommand = require(modulePath);
        let getInstanceStub, config, instanceConfig;

        beforeEach(function () {
            instanceConfig = new Config('config.json');
            getInstanceStub = sinon.stub().returns({ config: instanceConfig });
            config = new ConfigCommand({}, { getInstance: getInstanceStub });
        });

        it('returns no prompts if url is defined and db is sqlite3', function () {
            let argv = {
                url: 'someurl.com',
                db: 'sqlite3'
            };

            let result = config.getConfigPrompts(argv);
            expect(result).to.deep.equal([]);
        });

        it('returns url prompt with validator if url is not provided and db is sqlite3', function () {
            let argv = { db: 'sqlite3' };
            let result = config.getConfigPrompts(argv);

            expect(result).to.have.length(1);
            expect(result[0].name).to.equal('url');
            expect(result[0].validate('http://localhost:2368')).to.be.true;
            expect(result[0].validate('notaurl')).to.match(/Invalid URL/);
        });

        it('returns db prompts if db arg not provided', function () {
            let argv = { url: 'http://localhost.com' };
            let result = config.getConfigPrompts(argv);

            expect(result).to.have.length(4);
            expect(result.find(prompt => prompt.name === 'dbhost')).to.be.ok;
            expect(result.find(prompt => prompt.name === 'dbuser')).to.be.ok;
            expect(result.find(prompt => prompt.name === 'dbpass')).to.be.ok;
            expect(result.find(prompt => prompt.name === 'dbname')).to.be.ok;
        });

        it('returns db prompts if db arg is not sqlite3', function () {
            let argv = { url: 'http://localhost.com', db: 'mysql' };
            instanceConfig.set('database.connection.password', 'password');
            let result = config.getConfigPrompts(argv);

            expect(result).to.have.length(4);
            expect(result.find(prompt => prompt.name === 'dbhost')).to.be.ok;

            let userprompt = result.find(prompt => prompt.name === 'dbuser');
            expect(userprompt).to.be.ok;
            expect(userprompt.validate('')).to.match(/must supply a MySQL username/);
            expect(userprompt.validate('root')).to.be.true;

            let passprompt = result.find(prompt => prompt.name === 'dbpass');
            expect(passprompt).to.be.ok;
            expect(passprompt.message).to.match(/skip to keep current/);

            expect(result.find(prompt => prompt.name === 'dbname')).to.be.ok;
        });

        it('doesn\'t return dbhost prompt if dbhost provided', function () {
            let argv = { url: 'http://localhost.com', db: 'mysql', dbhost: 'localhost' };
            let result = config.getConfigPrompts(argv);

            expect(result).to.have.length(3);
            expect(result.find(prompt => prompt.name === 'dbhost')).to.not.be.ok;
            expect(result.find(prompt => prompt.name === 'dbuser')).to.be.ok;
            expect(result.find(prompt => prompt.name === 'dbpass')).to.be.ok;
            expect(result.find(prompt => prompt.name === 'dbname')).to.be.ok;
        });

        it('doesn\'t return dbuser prompt if dbuser provided', function () {
            let argv = { url: 'http://localhost.com', db: 'mysql', dbuser: 'root' };
            let result = config.getConfigPrompts(argv);

            expect(result).to.have.length(3);
            expect(result.find(prompt => prompt.name === 'dbhost')).to.be.ok;
            expect(result.find(prompt => prompt.name === 'dbuser')).to.not.be.ok;
            expect(result.find(prompt => prompt.name === 'dbpass')).to.be.ok;
            expect(result.find(prompt => prompt.name === 'dbname')).to.be.ok;
        });

        it('doesn\'t return dbpass prompt if dbpass provided', function () {
            let argv = { url: 'http://localhost.com', db: 'mysql', dbpass: 'password' };
            let result = config.getConfigPrompts(argv);

            expect(result).to.have.length(3);
            expect(result.find(prompt => prompt.name === 'dbhost')).to.be.ok;
            expect(result.find(prompt => prompt.name === 'dbuser')).to.be.ok;
            expect(result.find(prompt => prompt.name === 'dbpass')).to.not.be.ok;
            expect(result.find(prompt => prompt.name === 'dbname')).to.be.ok;
        });

        it('doesn\'t return dbname prompt if dbname provided', function () {
            let argv = { url: 'http://localhost.com', db: 'mysql', dbname: 'ghost' };
            let result = config.getConfigPrompts(argv);

            expect(result).to.have.length(3);
            expect(result.find(prompt => prompt.name === 'dbhost')).to.be.ok;
            expect(result.find(prompt => prompt.name === 'dbuser')).to.be.ok;
            expect(result.find(prompt => prompt.name === 'dbpass')).to.be.ok;
            expect(result.find(prompt => prompt.name === 'dbname')).to.not.be.ok;
        });
    });

    describe('run', function () {
        let ConfigCommand = require(modulePath);

        it('outputs key if key defined and value is not', function () {
            let logStub = sinon.stub();
            let checkEnvironmentStub = sinon.stub();
            let instanceConfig = new Config('config.json');
            let getInstanceStub = sinon.stub().returns({checkEnvironment: checkEnvironmentStub, config: instanceConfig});
            instanceConfig.set('url', 'http://localhost:2368');

            let config = new ConfigCommand({log: logStub}, {getInstance: getInstanceStub});

            return config.run({key: 'url'}).then(() => {
                expect(checkEnvironmentStub.calledOnce).to.be.true;
                expect(logStub.calledOnce).to.be.true;
                expect(logStub.args[0][0]).to.equal('http://localhost:2368');

                return config.run({key: 'nope'});
            }).then(() => {
                expect(checkEnvironmentStub.calledTwice).to.be.true;
                expect(logStub.calledOnce).to.be.true;
            });
        });

        it('sets value if both key and value defined', function () {
            let checkEnvironmentStub = sinon.stub();
            let instanceConfig = new Config('config.json');
            let setStub = sinon.stub(instanceConfig, 'set').returns(instanceConfig);
            let saveStub = sinon.stub(instanceConfig, 'save');
            let getInstanceStub = sinon.stub().returns({checkEnvironment: checkEnvironmentStub, config: instanceConfig});

            let config = new ConfigCommand({}, {getInstance: getInstanceStub});

            return config.run({key: 'url', value: 'http://localhost:2368'}).then(() => {
                expect(checkEnvironmentStub.calledOnce).to.be.true;
                expect(setStub.calledOnce).to.be.true;
                expect(saveStub.calledOnce).to.be.true;
                expect(setStub.args[0]).to.deep.equal(['url', 'http://localhost:2368']);
            });
        });

        it('calls handleAdvancedOptions without prompts if no-prompt is set', function () {
            let getInstanceStub = sinon.stub().returns({});

            let config = new ConfigCommand({}, {getInstance: getInstanceStub});
            let getConfigPromptsStub = sinon.stub(config, 'getConfigPrompts').returns([]);
            let handleAdvancedOptionsStub = sinon.stub(config, 'handleAdvancedOptions').resolves({ result: true });

            return config.run({ prompt: false }).then((result) => {
                expect(result).to.deep.equal({ result: true });
                expect(getConfigPromptsStub.calledOnce).to.be.true;
                expect(getConfigPromptsStub.args[0][0]).to.deep.equal({ prompt: false });
                expect(handleAdvancedOptionsStub.calledOnce).to.be.true;
                expect(handleAdvancedOptionsStub.args[0][0]).to.deep.equal({ prompt: false });
            });
        });

        it('calls handleAdvancedOptions without prompts if no prompts are needed', function () {
            let getInstanceStub = sinon.stub().returns({});

            let config = new ConfigCommand({}, {getInstance: getInstanceStub});
            let getConfigPromptsStub = sinon.stub(config, 'getConfigPrompts').returns([]);
            let handleAdvancedOptionsStub = sinon.stub(config, 'handleAdvancedOptions').resolves({ result: true });

            return config.run({ prompt: true }).then((result) => {
                expect(result).to.deep.equal({ result: true });
                expect(getConfigPromptsStub.calledOnce).to.be.true;
                expect(getConfigPromptsStub.args[0][0]).to.deep.equal({ prompt: true });
                expect(handleAdvancedOptionsStub.calledOnce).to.be.true;
                expect(handleAdvancedOptionsStub.args[0][0]).to.deep.equal({ prompt: true });
            });
        });

        it('prompts with defined prompts, passes result to handleAdvancedOptions', function () {
            let getInstanceStub = sinon.stub().returns({});
            let promptStub = sinon.stub().resolves({});

            let config = new ConfigCommand({prompt: promptStub}, {getInstance: getInstanceStub});
            let getConfigPromptsStub = sinon.stub(config, 'getConfigPrompts').returns([{ name: 'dbhost' }]);
            let handleAdvancedOptionsStub = sinon.stub(config, 'handleAdvancedOptions').resolves({ result: true });

            return config.run({ prompt: true }).then((result) => {
                expect(result).to.deep.equal({ result: true });
                expect(getConfigPromptsStub.calledOnce).to.be.true;
                expect(getConfigPromptsStub.args[0][0]).to.deep.equal({ prompt: true });
                expect(promptStub.calledOnce).to.be.true;
                expect(promptStub.args[0][0]).to.deep.equal([{ name: 'dbhost' }]);
                expect(handleAdvancedOptionsStub.calledOnce).to.be.true;
                expect(handleAdvancedOptionsStub.args[0][0]).to.deep.equal({ prompt: true });
            });
        });

        it('sets db to mysql if dbhost is provided via prompts', function () {
            let getInstanceStub = sinon.stub().returns({});
            let promptStub = sinon.stub().resolves({ dbhost: 'localhost' });

            let config = new ConfigCommand({prompt: promptStub}, {getInstance: getInstanceStub});
            let getConfigPromptsStub = sinon.stub(config, 'getConfigPrompts').returns([{ name: 'dbhost' }]);
            let handleAdvancedOptionsStub = sinon.stub(config, 'handleAdvancedOptions').resolves({ result: true });

            return config.run({ prompt: true }).then((result) => {
                expect(result).to.deep.equal({ result: true });
                expect(getConfigPromptsStub.calledOnce).to.be.true;
                expect(getConfigPromptsStub.args[0][0]).to.deep.equal({ prompt: true, db: 'mysql', dbhost: 'localhost' });
                expect(promptStub.calledOnce).to.be.true;
                expect(promptStub.args[0][0]).to.deep.equal([{ name: 'dbhost' }]);
                expect(handleAdvancedOptionsStub.calledOnce).to.be.true;
                expect(handleAdvancedOptionsStub.args[0][0]).to.deep.equal({ prompt: true, db: 'mysql', dbhost: 'localhost' });
            });
        });

        it('doesn\'t add null prompt values to argv object', function () {
            let getInstanceStub = sinon.stub().returns({});
            let promptStub = sinon.stub().resolves({ dbhost: 'localhost', dbpass: '' });

            let config = new ConfigCommand({prompt: promptStub}, {getInstance: getInstanceStub});
            let getConfigPromptsStub = sinon.stub(config, 'getConfigPrompts').returns([{ name: 'dbhost' }]);
            let handleAdvancedOptionsStub = sinon.stub(config, 'handleAdvancedOptions').resolves({ result: true });

            return config.run({ prompt: true }).then((result) => {
                expect(result).to.deep.equal({ result: true });
                expect(getConfigPromptsStub.calledOnce).to.be.true;
                expect(getConfigPromptsStub.args[0][0]).to.deep.equal({ prompt: true, db: 'mysql', dbhost: 'localhost' });
                expect(promptStub.calledOnce).to.be.true;
                expect(promptStub.args[0][0]).to.deep.equal([{ name: 'dbhost' }]);
                expect(handleAdvancedOptionsStub.calledOnce).to.be.true;
                expect(handleAdvancedOptionsStub.args[0][0]).to.deep.equal({ prompt: true, db: 'mysql', dbhost: 'localhost' });
            });
        });
    });

    describe('advanced options', function () {
        it('url', function () {
            let advancedOptions = require(advancedModulePath);
            expect(advancedOptions.url).to.exist;

            // Check validate function
            expect(advancedOptions.url.validate('http://localhost:2368')).to.be.true;
            expect(advancedOptions.url.validate('localhost:2368')).to.match(/Invalid URL/);
            expect(advancedOptions.url.validate('not even remotely a URL')).to.match(/Invalid URL/);

            // Check transform function
            expect(advancedOptions.url.transform('http://MyUpperCaseUrl.com')).to.equal('http://myuppercaseurl.com');
        });

        it('adminUrl', function () {
            let advancedOptions = require(advancedModulePath);
            expect(advancedOptions.adminUrl).to.exist;

            // Check validate function
            expect(advancedOptions.adminUrl.validate('http://localhost:2368')).to.be.true;
            expect(advancedOptions.adminUrl.validate('localhost:2368')).to.match(/Invalid URL/);
            expect(advancedOptions.adminUrl.validate('not even remotely a URL')).to.match(/Invalid URL/);

            // Check transform function
            expect(advancedOptions.adminUrl.transform('http://MyUpperCaseUrl.com')).to.equal('http://myuppercaseurl.com');
        });

        it('port', function () {
            let portPromiseStub = sinon.stub().resolves('2367');
            let advancedOptions = proxyquire(advancedModulePath, { portfinder: { getPortPromise: portPromiseStub }});

            expect(advancedOptions.port).to.exist;

            // Check validate
            expect(advancedOptions.port.validate('not an int')).to.match(/must be an integer/);

            return Promise.props({
                validateExpectsTrue: advancedOptions.port.validate('2367'),
                validateExpectsMessage: advancedOptions.port.validate('2366'),
                defaultCalledWithUrlPort: advancedOptions.port.defaultValue({ get: () => 'http://localhost:2369' }),
                defaultCalledWithNoUrlPort: advancedOptions.port.defaultValue({ get: () => 'http://example.com' })
            }).then((results) => {
                expect(results.validateExpectsTrue).to.be.true;
                expect(results.validateExpectsMessage).to.match(/'2366' is in use/);

                expect(portPromiseStub.calledWithExactly({ port: '2366' })).to.be.true;
                expect(portPromiseStub.calledWithExactly({ port: '2367' })).to.be.true;
                expect(portPromiseStub.calledWithExactly({ port: '2368' })).to.be.true;
                expect(portPromiseStub.calledWithExactly({ port: '2369' })).to.be.true;
            });
        });
    });

    it('db', function () {
        let advancedOptions = require(advancedModulePath);

        expect(advancedOptions.db).to.exist;
        expect(advancedOptions.db.validate('mysql')).to.be.true;
        expect(advancedOptions.db.validate('sqlite3')).to.be.true;
        expect(advancedOptions.db.validate('pg')).to.match(/Invalid database type/);
    });

    it('dbpath', function () {
        let advancedOptions = require(advancedModulePath);

        expect(advancedOptions.dbpath).to.exist;
        expect(advancedOptions.dbpath.defaultValue({ get: () => 'mysql'})).to.be.null;
        expect(advancedOptions.dbpath.defaultValue({ get: () => 'sqlite3'}, 'development')).to.equal('./content/data/ghost-dev.db');
        expect(advancedOptions.dbpath.defaultValue({ get: () => 'sqlite3'}, 'production')).to.equal('./content/data/ghost.db');
    });

    it('mail', function () {
        let advancedOptions = require(advancedModulePath);

        expect(advancedOptions.mail).to.exist;
        expect(advancedOptions.mail.validate('Sendmail')).to.be.true;
        expect(advancedOptions.mail.validate('SMS')).to.match(/Invalid mail transport/);
    });

    it('mailservice', function () {
        let advancedOptions = require(advancedModulePath);

        expect(advancedOptions.mailservice).to.exist;
        expect(advancedOptions.mailservice.validate('Mailgun')).to.be.true;
        expect(advancedOptions.mailservice.validate('CaspersFriendlyEmailService')).to.match(/Invalid mail service/);
    });

    it('process', function () {
        let advancedOptions = require(advancedModulePath);

        expect(advancedOptions.process).to.exist;
        expect(advancedOptions.process.defaultValue({}, 'production')).to.equal('systemd');
        expect(advancedOptions.process.defaultValue({}, 'development')).to.equal('local');
    });
});
