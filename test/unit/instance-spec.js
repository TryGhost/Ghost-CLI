'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const tmp = require('tmp');
const path = require('path');
const fs = require('fs-extra');

const Instance = require('../../lib/instance');
const Config = require('../../lib/utils/config');
const ProcessManager = require('../../lib/process-manager');

describe('Unit: Instance', function () {
    let sandbox;

    before(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('cliConfig getter', function () {
        it('returns a cached instance if one exists', function () {
            let testInstance = new Instance({}, {}, '');
            let cliConfigValue = {
                a: 'b',
                foo: 'bar',
                test: true
            };

            testInstance._cliConfig = cliConfigValue;
            expect(testInstance.cliConfig).to.deep.equal(cliConfigValue);
        });

        it('loads a new Config instance and caches it if no cached one is availalbe', function () {
            let testInstance = new Instance({}, {}, '/some/test/dir');
            let cliConfig = testInstance.cliConfig;

            expect(cliConfig).to.exist;
            expect(testInstance._cliConfig).to.deep.equal(cliConfig);
            expect(cliConfig.file).to.equal('/some/test/dir/.ghost-cli');
        });
    });

    describe('name getter', function () {
        it('returns name value in cliConfig if it exists', function () {
            let getStub = sandbox.stub().withArgs('name').returns('testing');
            class TestInstance extends Instance {
                get cliConfig() { return { get: getStub } };
            }
            let testInstance = new TestInstance({}, {}, '');
            let name = testInstance.name;

            expect(name).to.equal('testing');
            expect(getStub.calledOnce).to.be.true;
        });

        it('looks for value in environment config if cliConfig value doesn\'t exist', function () {
            let cliConfigGetStub = sandbox.stub().withArgs('name').returns(null);
            let configGetStub = sandbox.stub().withArgs('pname').returns('testing');
            class TestInstance extends Instance {
                get cliConfig() { return { get: cliConfigGetStub }; }
                get config() { return { get: configGetStub }; }
            }
            let testInstance = new TestInstance({}, {}, '');
            let name = testInstance.name;

            expect(name).to.equal('testing');
            expect(cliConfigGetStub.calledOnce).to.be.true;
            expect(configGetStub.calledOnce).to.be.true;
        });
    });

    describe('name setter', function () {
        it('sets name into cliConfig and saves it', function () {
            let setStub = sandbox.stub().withArgs('name', 'testing').returnsThis();
            let saveStub = sandbox.stub().returnsThis();
            class TestInstance extends Instance {
                get cliConfig() { return { set: setStub, save: saveStub } };
            }
            let testInstance = new TestInstance({}, {}, '');
            testInstance.name = 'testing';

            expect(setStub.calledOnce).to.be.true;
            expect(saveStub.calledOnce).to.be.true;
        });
    });

    describe('config getter', function () {
        it('returns cached instance if it exists and environment hasn\'t changed', function () {
            let testInstance = new Instance({}, { environment: 'testing' }, '');
            let testConfig = testInstance._config = {
                a: 'b',
                foo: 'bar',
                c: true,
                environment: 'testing'
            };

            let config = testInstance.config;
            expect(config).to.deep.equal(testConfig);
        });

        it('loads a new instance and caches it if cached instance exists but environment has changed', function () {
            let testInstance = new Instance({}, { environment: 'testing' }, '/some/test/dir');
            testInstance._config = { environment: 'development' };

            let config = testInstance.config;
            expect(config).to.be.an.instanceof(Config);
            expect(testInstance._config).to.deep.equal(config);
            expect(config.file).to.equal('/some/test/dir/config.testing.json');
            expect(config.environment).to.equal('testing');
        });

        it('loads a new instance (and caches it) if no cached instance exists', function () {
            let testInstance = new Instance({}, { environment: 'testing' }, '/some/test/dir');
            let config = testInstance.config;

            expect(config).to.be.an.instanceof(Config);
            expect(testInstance._config).to.deep.equal(config);
            expect(config.file).to.equal('/some/test/dir/config.testing.json');
            expect(config.environment).to.equal('testing');
        });
    });

    describe('process getter', function () {
        it('returns cached process instance if it exists', function () {
            let getStub = sandbox.stub().withArgs('process', 'local').returns('local');
            class TestInstance extends Instance {
                get config() { return { get: getStub}; }
            }
            let testInstance = new TestInstance({}, {}, '');
            let testProcess = testInstance._process = {
                name: 'local',
                a: 'b',
                foo: 'bar',
                test: true
            };

            let proc = testInstance.process;
            expect(proc).to.deep.equal(testProcess);
            expect(getStub.calledOnce).to.be.true;
        });

        it('loads new instance if cached one is available but the name is different', function () {
            let getStub = sandbox.stub().withArgs('process', 'local').returns('local');
            let procManagerStub = sandbox.stub().withArgs('local').returns({ Class: ProcessManager });
            class TestInstance extends Instance {
                get config() { return { get: getStub}; }
            }
            let testInstance = new TestInstance({}, {
                getProcessManager: procManagerStub
            }, '');
            testInstance._process = { name: 'systemd' };

            let proc = testInstance.process;
            expect(proc).to.be.an.instanceof(ProcessManager);
            expect(testInstance._process).to.deep.equal(proc);
            expect(getStub.calledOnce).to.be.true;
            expect(procManagerStub.calledOnce).to.be.true;
        });
    });

    it('sets up instance vars in constructor', function () {
        let testInstance = new Instance({ui: true}, {system: true}, 'some_test_dir');
        expect(testInstance.ui).to.deep.equal({ui: true});
        expect(testInstance.system).to.deep.equal({system: true});
        expect(testInstance.dir).to.equal('some_test_dir');
    });

    describe('running', function () {
        it('sets running property in cliConfig', function () {
            let setStub = sandbox.stub().withArgs('running', 'testing').returnsThis();
            let saveStub = sandbox.stub();
            class TestInstance extends Instance {
                get cliConfig() { return { set: setStub, save: saveStub }; }
            }
            let testInstance = new TestInstance({}, {}, '');
            testInstance.running('testing');

            expect(setStub.calledOnce).to.be.true;
            expect(saveStub.calledOnce).to.be.true;
        });

        it('returns false if running property not set in config', function () {
            let hasStub = sandbox.stub().withArgs('running').returns(false);
            class TestInstance extends Instance {
                get cliConfig() { return { has: hasStub } };
            }
            let testInstance = new TestInstance({}, {}, '');

            let running = testInstance.running();
            expect(running).to.be.false;
            expect(hasStub.calledOnce).to.be.true;
        });

        it('loads running environment and checks if process manager returns false', function () {
            let hasStub = sandbox.stub().withArgs('running').returns(true);
            let isRunningStub = sandbox.stub().returns(true);
            class TestInstance extends Instance {
                get cliConfig() { return { has: hasStub }; }
                get process() { return { isRunning: isRunningStub } }
            };
            let testInstance = new TestInstance({}, {}, '');
            let loadRunEnvStub = sandbox.stub(testInstance, 'loadRunningEnvironment');

            let running = testInstance.running();
            expect(running).to.be.true;
            expect(hasStub.calledOnce).to.be.true;
            expect(isRunningStub.calledOnce).to.be.true;
            expect(loadRunEnvStub.calledOnce).to.be.true;
        });

        it('sets running to null in cliConfig if process manager\'s isRunning method returns false', function () {
            let hasStub = sandbox.stub().withArgs('running').returns(true);
            let setStub = sandbox.stub().withArgs('running', null).returnsThis();
            let saveStub = sandbox.stub().returnsThis();
            let isRunningStub = sandbox.stub().returns(false);
            class TestInstance extends Instance {
                get cliConfig() { return { has: hasStub, set: setStub, save: saveStub }; }
                get process() { return { isRunning: isRunningStub }; }
            }
            let testInstance = new TestInstance({}, {}, '');
            let loadRunEnvStub = sandbox.stub(testInstance, 'loadRunningEnvironment');

            let running = testInstance.running();
            expect(running).to.be.false;
            expect(hasStub.calledOnce).to.be.true;
            expect(setStub.calledOnce).to.be.true;
            expect(saveStub.calledOnce).to.be.true;
            expect(isRunningStub.calledOnce).to.be.true;
            expect(loadRunEnvStub.calledOnce).to.be.true;
        });
    });

    describe('checkEnvironment', function () {
        it('doesn\'t do anything if environment is not production', function () {
            let logStub = sandbox.stub();
            let environmentStub = sandbox.stub();
            let testInstance = new Instance({ log: logStub }, {
                setEnvironment: environmentStub,
                production: false,
                environment: 'development'
            }, '');

            testInstance.checkEnvironment();
            expect(logStub.called).to.be.false;
            expect(environmentStub.called).to.be.false;
        });

        it('doesn\'t do anything if config.development.json doesn\'t exist', function () {
            let logStub = sandbox.stub();
            let environmentStub = sandbox.stub();
            let existsStub = sandbox.stub(Config, 'exists').withArgs('/path/config.development.json').returns(false);
            let testInstance = new Instance({ log: logStub }, {
                setEnvironment: environmentStub,
                production: true,
                environment: 'production'
            }, '/path');

            testInstance.checkEnvironment();
            expect(logStub.called).to.be.false;
            expect(environmentStub.called).to.be.false;
            expect(existsStub.calledOnce).to.be.true;
        });

        it('logs and sets environment if not production, config.dev exists, and config.production doesn\'t exist', function () {
            let logStub = sandbox.stub();
            let environmentStub = sandbox.stub();
            let existsStub = sandbox.stub(Config, 'exists');
            existsStub.withArgs('/path/config.development.json').returns(true);
            existsStub.withArgs('/path/config.production.json').returns(false);
            let testInstance = new Instance({ log: logStub }, {
                setEnvironment: environmentStub,
                production: true,
                environment: 'production'
            }, '/path');

            testInstance.checkEnvironment();

            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/Found a development config/);
            expect(environmentStub.calledOnce).to.be.true;
            expect(environmentStub.args[0]).to.deep.equal([true, true]);
            expect(existsStub.calledTwice).to.be.true;
        });
    });

    describe('loadRunningEnvironment', function () {
        it('throws error if instance is not running', function () {
            let getStub = sandbox.stub().withArgs('running').returns(null);
            class TestInstance extends Instance {
                get cliConfig() { return { get: getStub }; }
            }
            let testInstance = new TestInstance({}, {}, '');

            try {
                testInstance.loadRunningEnvironment();
                expect(true, 'should have thrown error').to.be.false;
            } catch (e) {
                expect(getStub.calledOnce).to.be.true;
                expect(e.message).to.match(/instance is not running/);
            }
        });

        it('calls setEnvironment and passes through variables', function () {
            let getStub = sandbox.stub().withArgs('running').returns('development');
            let envStub = sandbox.stub();
            class TestInstance extends Instance {
                get cliConfig() { return { get: getStub }; }
            }
            let testInstance = new TestInstance({}, {
                setEnvironment: envStub
            }, '');

            testInstance.loadRunningEnvironment(false);
            expect(getStub.calledOnce).to.be.true;
            expect(envStub.calledOnce).to.be.true;
            expect(envStub.args[0]).to.deep.equal([true, false]);
        });
    });

    describe('summary', function () {
        it('returns shortened object if running is false', function () {
            let getStub = sandbox.stub().withArgs('active-version').returns('1.0.0');
            class TestInstance extends Instance {
                get name() { return 'testing'; }
                get cliConfig() { return { get: getStub }; }
                running() { return false; }
            }
            let testInstance = new TestInstance({}, {}, '');
            let result = testInstance.summary();

            expect(result.running).to.be.false;
            expect(result.name).to.equal('testing');
            expect(result.version).to.equal('1.0.0');
            expect(result.mode).to.be.undefined;
        });

        it('loads running environment and returns full object if running is true', function () {
            let cliGetStub = sandbox.stub().withArgs('active-version').returns('1.0.0');
            let getStub = sandbox.stub();
            getStub.withArgs('url').returns('localhost');
            getStub.withArgs('server.port').returns(1234);

            class TestInstance extends Instance {
                get name() { return 'testing'; }
                get cliConfig() { return { get: cliGetStub}; }
                get config() { return { get: getStub}; }
                get process() { return { name: 'local' }; }
                running() { return true; }
            }
            let testInstance = new TestInstance({}, {environment: 'testing'}, '');
            let loadRunEnvStub = sandbox.stub(testInstance, 'loadRunningEnvironment');

            let result = testInstance.summary();
            expect(loadRunEnvStub.calledOnce).to.be.true;
            expect(result.running).to.be.true;
            expect(result.name).to.equal('testing');
            expect(result.mode).to.equal('testing');
            expect(result.url).to.equal('localhost');
        });
    });

    describe('template', function () {
        it('immediately calls _generateTemplate if ui.allowPrompt is false', function () {
            let promptStub = sandbox.stub().resolves();
            let testInstance = new Instance({
                prompt: promptStub,
                allowPrompt: false,
                verbose: true
            }, {}, '');
            let generateStub = sandbox.stub(testInstance, '_generateTemplate').resolves(true);

            return testInstance.template('some contents', 'a file', 'file.txt', '/some/dir').then((result) => {
                expect(result).to.be.true;
                expect(promptStub.called).to.be.false;
                expect(generateStub.calledOnce).to.be.true;
                expect(generateStub.args[0][0]).to.equal('some contents');
            });
        });

        it('immediately calls _generateTemplate if ui.verbose is false', function () {
            let promptStub = sandbox.stub().resolves();
            let testInstance = new Instance({
                prompt: promptStub,
                allowPrompt: true,
                verbose: false
            }, {}, '');
            let generateStub = sandbox.stub(testInstance, '_generateTemplate').resolves(true);

            return testInstance.template('some contents', 'a file', 'file.txt', '/some/dir').then((result) => {
                expect(result).to.be.true;
                expect(promptStub.called).to.be.false;
                expect(generateStub.calledOnce).to.be.true;
                expect(generateStub.args[0][0]).to.equal('some contents');
            });
        });

        it('immediately calls _generateTemplate if ui.allowPrompt and ui.verbose is false', function () {
            let promptStub = sandbox.stub().resolves();
            let testInstance = new Instance({
                prompt: promptStub,
                allowPrompt: true,
                verbose: false
            }, {}, '');
            let generateStub = sandbox.stub(testInstance, '_generateTemplate').resolves(true);

            return testInstance.template('some contents', 'a file', 'file.txt', '/some/dir').then((result) => {
                expect(result).to.be.true;
                expect(promptStub.called).to.be.false;
                expect(generateStub.calledOnce).to.be.true;
                expect(generateStub.args[0][0]).to.equal('some contents');
            });
        });

        it('generates template if the choice is to continue (with --verbose)', function () {
            let promptStub = sandbox.stub().resolves({choice: 'continue'});
            let testInstance = new Instance({ prompt: promptStub, allowPrompt: true, verbose: true }, {} , '');
            let generateStub = sandbox.stub(testInstance, '_generateTemplate').resolves(true);

            return testInstance.template('some contents', 'a file', 'file.txt', '/some/dir').then((result) => {
                expect(result).to.be.true;
                expect(generateStub.calledOnce).to.be.true;
                expect(promptStub.calledOnce).to.be.true;
                expect(generateStub.args[0]).to.deep.equal(['some contents', 'a file', 'file.txt', '/some/dir']);
            });
        });

        it('logs and calls template method again if choice is view (with --verbose)', function () {
            let promptStub = sandbox.stub();
            promptStub.onCall(0).resolves({choice: 'view'});
            promptStub.onCall(1).resolves({choice: 'continue'});
            let logStub = sandbox.stub();
            let testInstance = new Instance({ log: logStub, prompt: promptStub, allowPrompt: true, verbose: true }, {}, '');
            let generateStub = sandbox.stub(testInstance, '_generateTemplate').resolves(true);

            return testInstance.template('some contents', 'a file', 'file.txt', '/some/dir').then((result) => {
                expect(result).to.be.true;
                expect(promptStub.calledTwice).to.be.true;
                expect(logStub.calledOnce).to.be.true;
                expect(logStub.args[0][0]).to.equal('some contents');
                expect(generateStub.calledOnce).to.be.true;
                expect(generateStub.args[0]).to.deep.equal(['some contents', 'a file', 'file.txt', '/some/dir']);
            });
        });

        it('opens editor and generates template with contents if choice is edit (with --verbose)', function () {
            let promptStub = sandbox.stub();
            promptStub.onCall(0).resolves({choice: 'edit'});
            promptStub.onCall(1).resolves({contents: 'some edited contents'});
            let testInstance = new Instance({ prompt: promptStub, allowPrompt: true, verbose: true }, {}, '');
            let generateStub = sandbox.stub(testInstance, '_generateTemplate').resolves(true);

            return testInstance.template('some contents', 'a file', 'file.txt', '/some/dir').then((result) => {
                expect(result).to.be.true;
                expect(promptStub.calledTwice).to.be.true;
                expect(generateStub.calledOnce).to.be.true;
                expect(generateStub.args[0][0]).to.equal('some edited contents');
            });
        });
    });

    describe('_generateTemplate', function () {
        it('writes out template to correct directory but doesn\'t link if no dir is passed', function () {
            let dir = tmp.dirSync({unsafeCleanup: true}).name;
            let successStub = sandbox.stub();
            let testInstance = new Instance({success: successStub}, {}, dir);

            return testInstance._generateTemplate('some contents', 'a file', 'file.txt').then((result) => {
                expect(result).to.be.true;
                let fpath = path.join(dir, 'system', 'files', 'file.txt');
                expect(fs.existsSync(fpath)).to.be.true;
                expect(fs.readFileSync(fpath, 'utf8')).to.equal('some contents');
                expect(successStub.calledOnce).to.be.true;
            });
        });

        it('writes out template and links it correctly if dir is passed', function () {
            let dir = tmp.dirSync({unsafeCleanup: true}).name;
            let sudoStub = sandbox.stub().resolves();
            let successStub = sandbox.stub();
            let testInstance = new Instance({ sudo: sudoStub, success: successStub }, {}, dir);

            return testInstance._generateTemplate('some contents', 'a file', 'file.txt', '/another/dir').then((result) => {
                expect(result).to.be.true;
                let fpath = path.join(dir, 'system', 'files', 'file.txt');
                expect(fs.existsSync(fpath)).to.be.true;
                expect(fs.readFileSync(fpath, 'utf8')).to.equal('some contents');
                expect(sudoStub.calledOnce).to.be.true;
                expect(sudoStub.args[0][0]).to.equal(`ln -sf ${fpath} /another/dir/file.txt`);
                expect(successStub.calledOnce).to.be.true;
                expect(successStub.firstCall.args[0]).to.match(/^Creating a file file at/);
            });
        });
    });
});
