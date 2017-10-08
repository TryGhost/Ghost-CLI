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
        const instanceStub = sinon.stub().returns({instance: true});
        const ConfigCommand = require(modulePath);

        const config = new ConfigCommand({}, {getInstance: instanceStub});

        expect(instanceStub.calledOnce).to.be.true;
        expect(config.instance).to.deep.equal({instance: true});
    });

    describe('handleAdvancedOptions', function () {
        it('sets config url to new port if port is different then what url is set to', function () {
            const ConfigCommand = proxyquire(modulePath, {'./advanced': {}});
            const instanceConfig = new Config('config.json');
            const saveStub = sinon.stub(instanceConfig, 'save');
            const getInstanceStub = sinon.stub().returns({config: instanceConfig});
            const config = new ConfigCommand({}, {getInstance: getInstanceStub});

            instanceConfig.set('url', 'http://localhost:2368');
            instanceConfig.set('server.port', 2369);

            return config.handleAdvancedOptions().then(() => {
                expect(instanceConfig.get('url')).to.equal('http://localhost:2369/');
                expect(instanceConfig.get('server.port')).to.equal(2369);
                expect(saveStub.calledOnce).to.be.true;
            });
        });

        it('does not change port if port not defined', function () {
            const ConfigCommand = proxyquire(modulePath, {'./advanced': {}});
            const instanceConfig = new Config('config.json');
            const saveStub = sinon.stub(instanceConfig, 'save');
            const getInstanceStub = sinon.stub().returns({config: instanceConfig});
            const config = new ConfigCommand({}, {getInstance: getInstanceStub});

            instanceConfig.set('url', 'http://localhost:2368');

            return config.handleAdvancedOptions().then(() => {
                expect(instanceConfig.get('url')).to.equal('http://localhost:2368');
                expect(instanceConfig.get('server.port', null)).to.equal(null);
                expect(saveStub.calledOnce).to.be.true;
            });
        });

        it('handles nonexistent values correctly', function () {
            const ConfigCommand = proxyquire(modulePath, {'./advanced': {
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
            }});
            const instanceConfig = new Config('config.json');
            const saveStub = sinon.stub(instanceConfig, 'save');
            const getInstanceStub = sinon.stub().returns({config: instanceConfig});
            const config = new ConfigCommand({}, {getInstance: getInstanceStub});

            return config.handleAdvancedOptions({log: []}).then(() => {
                expect(instanceConfig.get('url')).to.equal('http://localhost:2368');
                expect(instanceConfig.get('server.port')).to.be.undefined;
                expect(instanceConfig.get('logging.transports')).to.deep.equal(['file', 'stdout']);
                expect(saveStub.calledOnce).to.be.true;
            });
        });

        it('runs the transform function if one is set', function () {
            const ConfigCommand = proxyquire(modulePath, {'./advanced': {
                url: {
                    transform: value => value.toLowerCase()
                }
            }});
            const instanceConfig = new Config('config.json');
            const saveStub = sinon.stub(instanceConfig, 'save');
            const getInstanceStub = sinon.stub().returns({config: instanceConfig});
            const config = new ConfigCommand({}, {getInstance: getInstanceStub});

            return config.handleAdvancedOptions({url: 'http://MyWebsite.com'}).then(() => {
                expect(instanceConfig.get('url')).to.equal('http://mywebsite.com');
                expect(saveStub.calledOnce).to.be.true;
            });
        });

        it('throws config error if validate function is defined and doesn\'t return true', function () {
            const ConfigCommand = proxyquire(modulePath, {'./advanced': {
                url: {
                    validate: () => 'invalid url'
                }
            }});
            const instanceConfig = new Config('config.json');
            const getInstanceStub = sinon.stub().returns({config: instanceConfig});
            const config = new ConfigCommand({}, {getInstance: getInstanceStub});

            return config.handleAdvancedOptions({url: 'http://localhost:2368'}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.ConfigError);
                expect(error.options.config).to.deep.equal({url: 'http://localhost:2368'});
            });
        });

        it('handles non-string arg values correctly', function () {
            const ConfigCommand = require(modulePath);
            const instanceConfig = new Config('config.json');
            const getInstanceStub = sinon.stub().returns({config: instanceConfig});
            const save = sinon.stub(instanceConfig, 'save');
            const config = new ConfigCommand({}, {getInstance: getInstanceStub});

            return config.handleAdvancedOptions({url: 'http://localhost:2368/', port: 1234}).then(() => {
                expect(getInstanceStub.calledOnce).to.be.true;
                expect(save.calledOnce).to.be.true;
                expect(instanceConfig.get('url')).to.equal('http://localhost:1234/');
                expect(instanceConfig.get('server.port')).to.equal(1234);
            });
        });
    });

    describe('getConfigPrompts', function () {
        const ConfigCommand = require(modulePath);
        let getInstanceStub, config, instanceConfig;

        beforeEach(function () {
            instanceConfig = new Config('config.json');
            getInstanceStub = sinon.stub().returns({config: instanceConfig});
            config = new ConfigCommand({}, {getInstance: getInstanceStub});
        });

        it('returns no prompts if url is defined and db is sqlite3', function () {
            const argv = {
                url: 'someurl.com',
                db: 'sqlite3'
            };

            const result = config.getConfigPrompts(argv);
            expect(result).to.deep.equal([]);
        });

        it('returns url prompt with validator if url is not provided and db is sqlite3', function () {
            const argv = {db: 'sqlite3'};
            const result = config.getConfigPrompts(argv);

            expect(result).to.have.length(1);
            expect(result[0].name).to.equal('url');
            expect(result[0].validate('http://localhost:2368')).to.be.true;
            expect(result[0].validate('notaurl')).to.match(/Invalid URL/);
        });

        it('returns db prompts if db arg not provided', function () {
            const argv = {url: 'http://localhost.com'};
            const result = config.getConfigPrompts(argv);

            expect(result).to.have.length(4);
            expect(result.find(prompt => prompt.name === 'dbhost')).to.be.ok;
            expect(result.find(prompt => prompt.name === 'dbuser')).to.be.ok;
            expect(result.find(prompt => prompt.name === 'dbpass')).to.be.ok;
            expect(result.find(prompt => prompt.name === 'dbname')).to.be.ok;
        });

        it('returns db prompts if db arg is not sqlite3', function () {
            const argv = {url: 'http://localhost.com', db: 'mysql'};
            instanceConfig.set('database.connection.password', 'password');
            const result = config.getConfigPrompts(argv);

            expect(result).to.have.length(4);
            expect(result.find(prompt => prompt.name === 'dbhost')).to.be.ok;

            const userprompt = result.find(prompt => prompt.name === 'dbuser');
            expect(userprompt).to.be.ok;
            expect(userprompt.validate('')).to.match(/must supply a MySQL username/);
            expect(userprompt.validate('root')).to.be.true;

            const passprompt = result.find(prompt => prompt.name === 'dbpass');
            expect(passprompt).to.be.ok;
            expect(passprompt.message).to.match(/skip to keep current/);

            const nameprompt = result.find(prompt => prompt.name === 'dbname');
            expect(nameprompt).to.be.ok;
            expect(nameprompt.validate('example123')).to.be.true;
            expect(nameprompt.validate('example123.com')).to.match(/consist of only alpha/);
            expect(nameprompt.validate('example-123')).to.match(/consist of only alpha/);
            expect(nameprompt.validate('example!!!')).to.match(/consist of only alpha/);
        });

        it('doesn\'t return dbhost prompt if dbhost provided', function () {
            const argv = {url: 'http://localhost.com', db: 'mysql', dbhost: 'localhost'};
            const result = config.getConfigPrompts(argv);

            expect(result).to.have.length(3);
            expect(result.find(prompt => prompt.name === 'dbhost')).to.not.be.ok;
            expect(result.find(prompt => prompt.name === 'dbuser')).to.be.ok;
            expect(result.find(prompt => prompt.name === 'dbpass')).to.be.ok;
            expect(result.find(prompt => prompt.name === 'dbname')).to.be.ok;
        });

        it('doesn\'t return dbuser prompt if dbuser provided', function () {
            const argv = {url: 'http://localhost.com', db: 'mysql', dbuser: 'root'};
            const result = config.getConfigPrompts(argv);

            expect(result).to.have.length(3);
            expect(result.find(prompt => prompt.name === 'dbhost')).to.be.ok;
            expect(result.find(prompt => prompt.name === 'dbuser')).to.not.be.ok;
            expect(result.find(prompt => prompt.name === 'dbpass')).to.be.ok;
            expect(result.find(prompt => prompt.name === 'dbname')).to.be.ok;
        });

        it('doesn\'t return dbpass prompt if dbpass provided', function () {
            const argv = {url: 'http://localhost.com', db: 'mysql', dbpass: 'password'};
            const result = config.getConfigPrompts(argv);

            expect(result).to.have.length(3);
            expect(result.find(prompt => prompt.name === 'dbhost')).to.be.ok;
            expect(result.find(prompt => prompt.name === 'dbuser')).to.be.ok;
            expect(result.find(prompt => prompt.name === 'dbpass')).to.not.be.ok;
            expect(result.find(prompt => prompt.name === 'dbname')).to.be.ok;
        });

        it('doesn\'t return dbname prompt if dbname provided', function () {
            const argv = {url: 'http://localhost.com', db: 'mysql', dbname: 'ghost'};
            const result = config.getConfigPrompts(argv);

            expect(result).to.have.length(3);
            expect(result.find(prompt => prompt.name === 'dbhost')).to.be.ok;
            expect(result.find(prompt => prompt.name === 'dbuser')).to.be.ok;
            expect(result.find(prompt => prompt.name === 'dbpass')).to.be.ok;
            expect(result.find(prompt => prompt.name === 'dbname')).to.not.be.ok;
        });
    });

    describe('run', function () {
        const ConfigCommand = require(modulePath);

        it('outputs key if key defined and value is not', function () {
            const logStub = sinon.stub();
            const checkEnvironmentStub = sinon.stub();
            const instanceConfig = new Config('config.json');
            const getInstanceStub = sinon.stub().returns(
                {checkEnvironment: checkEnvironmentStub, config: instanceConfig}
            );
            instanceConfig.set('url', 'http://localhost:2368');

            const config = new ConfigCommand({log: logStub}, {getInstance: getInstanceStub});

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
            const checkEnvironmentStub = sinon.stub();
            const instanceConfig = new Config('config.json');
            const setStub = sinon.stub(instanceConfig, 'set').returns(instanceConfig);
            const saveStub = sinon.stub(instanceConfig, 'save');
            const getInstanceStub = sinon.stub().returns(
                {checkEnvironment: checkEnvironmentStub, config: instanceConfig}
            );

            const config = new ConfigCommand({}, {getInstance: getInstanceStub});

            return config.run({key: 'url', value: 'http://localhost:2368'}).then(() => {
                expect(checkEnvironmentStub.calledOnce).to.be.true;
                expect(setStub.calledOnce).to.be.true;
                expect(saveStub.calledOnce).to.be.true;
                expect(setStub.args[0]).to.deep.equal(['url', 'http://localhost:2368']);
            });
        });

        it('calls handleAdvancedOptions without prompts if no-prompt is set', function () {
            const getInstanceStub = sinon.stub().returns({});

            const config = new ConfigCommand({}, {getInstance: getInstanceStub});
            const getConfigPromptsStub = sinon.stub(config, 'getConfigPrompts').returns([]);
            const handleAdvancedOptionsStub = sinon.stub(config, 'handleAdvancedOptions').resolves({result: true});

            return config.run({prompt: false}).then((result) => {
                expect(result).to.deep.equal({result: true});
                expect(getConfigPromptsStub.calledOnce).to.be.true;
                expect(getConfigPromptsStub.args[0][0]).to.deep.equal({prompt: false});
                expect(handleAdvancedOptionsStub.calledOnce).to.be.true;
                expect(handleAdvancedOptionsStub.args[0][0]).to.deep.equal({prompt: false});
            });
        });

        it('calls handleAdvancedOptions without prompts if no prompts are needed', function () {
            const getInstanceStub = sinon.stub().returns({});

            const config = new ConfigCommand({}, {getInstance: getInstanceStub});
            const getConfigPromptsStub = sinon.stub(config, 'getConfigPrompts').returns([]);
            const handleAdvancedOptionsStub = sinon.stub(config, 'handleAdvancedOptions').resolves({result: true});

            return config.run({prompt: true}).then((result) => {
                expect(result).to.deep.equal({result: true});
                expect(getConfigPromptsStub.calledOnce).to.be.true;
                expect(getConfigPromptsStub.args[0][0]).to.deep.equal({prompt: true});
                expect(handleAdvancedOptionsStub.calledOnce).to.be.true;
                expect(handleAdvancedOptionsStub.args[0][0]).to.deep.equal({prompt: true});
            });
        });

        it('prompts with defined prompts, passes result to handleAdvancedOptions', function () {
            const getInstanceStub = sinon.stub().returns({});
            const promptStub = sinon.stub().resolves({});

            const config = new ConfigCommand({prompt: promptStub}, {getInstance: getInstanceStub});
            const getConfigPromptsStub = sinon.stub(config, 'getConfigPrompts').returns([{name: 'dbhost'}]);
            const handleAdvancedOptionsStub = sinon.stub(config, 'handleAdvancedOptions').resolves({result: true});

            return config.run({prompt: true}).then((result) => {
                expect(result).to.deep.equal({result: true});
                expect(getConfigPromptsStub.calledOnce).to.be.true;
                expect(getConfigPromptsStub.args[0][0]).to.deep.equal({prompt: true});
                expect(promptStub.calledOnce).to.be.true;
                expect(promptStub.args[0][0]).to.deep.equal([{name: 'dbhost'}]);
                expect(handleAdvancedOptionsStub.calledOnce).to.be.true;
                expect(handleAdvancedOptionsStub.args[0][0]).to.deep.equal({prompt: true});
            });
        });

        it('sets db to mysql if dbhost is provided via prompts', function () {
            const getInstanceStub = sinon.stub().returns({});
            const promptStub = sinon.stub().resolves({dbhost: 'localhost'});

            const config = new ConfigCommand({prompt: promptStub}, {getInstance: getInstanceStub});
            const getConfigPromptsStub = sinon.stub(config, 'getConfigPrompts').returns([{name: 'dbhost'}]);
            const handleAdvancedOptionsStub = sinon.stub(config, 'handleAdvancedOptions').resolves({result: true});

            return config.run({prompt: true}).then((result) => {
                expect(result).to.deep.equal({result: true});
                expect(getConfigPromptsStub.calledOnce).to.be.true;
                expect(getConfigPromptsStub.args[0][0]).to.deep.equal({prompt: true, db: 'mysql', dbhost: 'localhost'});
                expect(promptStub.calledOnce).to.be.true;
                expect(promptStub.args[0][0]).to.deep.equal([{name: 'dbhost'}]);
                expect(handleAdvancedOptionsStub.calledOnce).to.be.true;
                expect(handleAdvancedOptionsStub.args[0][0]).to.deep.equal({prompt: true, db: 'mysql', dbhost: 'localhost'});
            });
        });

        it('doesn\'t add null prompt values to argv object', function () {
            const getInstanceStub = sinon.stub().returns({});
            const promptStub = sinon.stub().resolves({dbhost: 'localhost', dbpass: ''});

            const config = new ConfigCommand({prompt: promptStub}, {getInstance: getInstanceStub});
            const getConfigPromptsStub = sinon.stub(config, 'getConfigPrompts').returns([{name: 'dbhost'}]);
            const handleAdvancedOptionsStub = sinon.stub(config, 'handleAdvancedOptions').resolves({result: true});

            return config.run({prompt: true}).then((result) => {
                expect(result).to.deep.equal({result: true});
                expect(getConfigPromptsStub.calledOnce).to.be.true;
                expect(getConfigPromptsStub.args[0][0]).to.deep.equal({prompt: true, db: 'mysql', dbhost: 'localhost'});
                expect(promptStub.calledOnce).to.be.true;
                expect(promptStub.args[0][0]).to.deep.equal([{name: 'dbhost'}]);
                expect(handleAdvancedOptionsStub.calledOnce).to.be.true;
                expect(handleAdvancedOptionsStub.args[0][0]).to.deep.equal({prompt: true, db: 'mysql', dbhost: 'localhost'});
            });
        });
    });

    describe('advanced options', function () {
        it('url', function () {
            const advancedOptions = require(advancedModulePath);
            expect(advancedOptions.url).to.exist;

            // Check validate function
            expect(advancedOptions.url.validate('http://localhost:2368')).to.be.true;
            expect(advancedOptions.url.validate('localhost:2368')).to.match(/Invalid URL/);
            expect(advancedOptions.url.validate('not even remotely a URL')).to.match(/Invalid URL/);

            // Check transform function
            expect(advancedOptions.url.transform('http://MyUpperCaseUrl.com')).to.equal('http://myuppercaseurl.com');
        });

        it('adminUrl', function () {
            const advancedOptions = require(advancedModulePath);
            expect(advancedOptions.adminUrl).to.exist;

            // Check validate function
            expect(advancedOptions.adminUrl.validate('http://localhost:2368')).to.be.true;
            expect(advancedOptions.adminUrl.validate('localhost:2368')).to.match(/Invalid URL/);
            expect(advancedOptions.adminUrl.validate('not even remotely a URL')).to.match(/Invalid URL/);

            // Check transform function
            expect(advancedOptions.adminUrl.transform('http://MyUpperCaseUrl.com')).to.equal('http://myuppercaseurl.com');
        });

        it('port', function () {
            const portPromiseStub = sinon.stub().resolves('2367');
            const advancedOptions = proxyquire(advancedModulePath, {portfinder: {getPortPromise: portPromiseStub}});

            expect(advancedOptions.port).to.exist;

            // Check validate
            expect(advancedOptions.port.validate('not an int')).to.match(/must be an integer/);

            return Promise.props({
                validateExpectsTrue: advancedOptions.port.validate('2367'),
                validateExpectsMessage: advancedOptions.port.validate('2366'),
                defaultCalledWithUrlPort: advancedOptions.port.defaultValue({get: () => 'http://localhost:2369'}),
                defaultCalledWithNoUrlPort: advancedOptions.port.defaultValue({get: () => 'http://example.com'})
            }).then((results) => {
                expect(results.validateExpectsTrue).to.be.true;
                expect(results.validateExpectsMessage).to.match(/'2366' is in use/);

                expect(portPromiseStub.calledWithExactly({port: 2366})).to.be.true;
                expect(portPromiseStub.calledWithExactly({port: 2367})).to.be.true;
                expect(portPromiseStub.calledWithExactly({port: 2368})).to.be.true;
                expect(portPromiseStub.calledWithExactly({port: 2369})).to.be.true;
            });
        });
    });

    it('db', function () {
        const advancedOptions = require(advancedModulePath);

        expect(advancedOptions.db).to.exist;
        expect(advancedOptions.db.validate('mysql')).to.be.true;
        expect(advancedOptions.db.validate('sqlite3')).to.be.true;
        expect(advancedOptions.db.validate('pg')).to.match(/Invalid database type/);
    });

    it('dbpath', function () {
        const advancedOptions = require(advancedModulePath);

        expect(advancedOptions.dbpath).to.exist;
        expect(advancedOptions.dbpath.defaultValue({get: () => 'mysql'})).to.be.null;
        expect(advancedOptions.dbpath.defaultValue({get: () => 'sqlite3'}, 'development')).to.equal('./content/data/ghost-dev.db');
        expect(advancedOptions.dbpath.defaultValue({get: () => 'sqlite3'}, 'production')).to.equal('./content/data/ghost.db');
    });

    it('mail', function () {
        const advancedOptions = require(advancedModulePath);

        expect(advancedOptions.mail).to.exist;
        expect(advancedOptions.mail.validate('Sendmail')).to.be.true;
        expect(advancedOptions.mail.validate('SMS')).to.match(/Invalid mail transport/);
    });

    it('mailservice', function () {
        const advancedOptions = require(advancedModulePath);

        expect(advancedOptions.mailservice).to.exist;
        expect(advancedOptions.mailservice.validate('Mailgun')).to.be.true;
        expect(advancedOptions.mailservice.validate('CaspersFriendlyEmailService')).to.match(/Invalid mail service/);
    });

    it('process', function () {
        const advancedOptions = require(advancedModulePath);

        expect(advancedOptions.process).to.exist;
        expect(advancedOptions.process.defaultValue({}, 'production')).to.equal('systemd');
        expect(advancedOptions.process.defaultValue({}, 'development')).to.equal('local');
    });
});
