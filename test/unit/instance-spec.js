'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const createConfigStub = require('../utils/config-stub');

const Instance = require('../../lib/instance');
const Config = require('../../lib/utils/config');
const ProcessManager = require('../../lib/process-manager');

function testConfigAccessors(instanceProp, configProp) {
    return () => {
        const config = createConfigStub();
        config.get.withArgs(configProp, null).returns('1.0.0');

        const instance = new Instance({}, {}, '');
        instance._cliConfig = config;

        expect(instance[instanceProp]).to.equal('1.0.0');
        expect(config.get.calledOnce).to.be.true;

        instance[instanceProp] = '2.0.0';
        expect(config.set.calledOnce).to.be.true;
        expect(config.set.calledWithExactly(configProp, '2.0.0')).to.be.true;
        expect(config.save.calledOnce).to.be.true;
    };
}

describe('Unit: Instance', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('name getter', function () {
        it('returns name value in cliConfig if it exists', function () {
            const config = createConfigStub();
            config.get.withArgs('name').returns('testing');

            const testInstance = new Instance({}, {}, '');
            testInstance._cliConfig = config;

            expect(testInstance.name).to.equal('testing');
            expect(config.get.calledOnce).to.be.true;
        });

        it('looks for value in environment config if cliConfig value doesn\'t exist', function () {
            const cliConfigGetStub = sinon.stub().withArgs('name').returns(null);
            const configGetStub = sinon.stub().withArgs('pname').returns('testing');
            class TestInstance extends Instance {
                get config() {
                    return {get: configGetStub};
                }
            }
            const testInstance = new TestInstance({}, {}, '');
            testInstance._cliConfig = {get: cliConfigGetStub};

            const name = testInstance.name;

            expect(name).to.equal('testing');
            expect(cliConfigGetStub.calledOnce).to.be.true;
            expect(configGetStub.calledOnce).to.be.true;
        });
    });

    describe('name setter', function () {
        it('sets name into cliConfig and saves it', function () {
            const config = createConfigStub();
            config.set.withArgs('name', 'testing').returnsThis();

            const testInstance = new Instance({}, {}, '');
            testInstance._cliConfig = config;

            testInstance.name = 'testing';

            expect(config.set.calledOnce).to.be.true;
            expect(config.save.calledOnce).to.be.true;
        });
    });

    describe('config getter', function () {
        it('returns cached instance if it exists and environment hasn\'t changed', function () {
            const testInstance = new Instance({}, {environment: 'testing'}, '');
            const testConfig = testInstance._config = {
                a: 'b',
                foo: 'bar',
                c: true,
                environment: 'testing'
            };

            const config = testInstance.config;
            expect(config).to.deep.equal(testConfig);
        });

        it('loads a new instance and caches it if cached instance exists but environment has changed', function () {
            const testInstance = new Instance({}, {environment: 'testing'}, '/some/test/dir');
            testInstance._config = {environment: 'development'};

            const config = testInstance.config;
            expect(config).to.be.an.instanceof(Config);
            expect(testInstance._config).to.deep.equal(config);
            expect(config.file).to.equal('/some/test/dir/config.testing.json');
            expect(config.environment).to.equal('testing');
        });

        it('loads a new instance (and caches it) if no cached instance exists', function () {
            const testInstance = new Instance({}, {environment: 'testing'}, '/some/test/dir');
            const config = testInstance.config;

            expect(config).to.be.an.instanceof(Config);
            expect(testInstance._config).to.deep.equal(config);
            expect(config.file).to.equal('/some/test/dir/config.testing.json');
            expect(config.environment).to.equal('testing');
        });
    });

    describe('process getter', function () {
        it('returns cached process instance if it exists', function () {
            const getStub = sinon.stub().withArgs('process', 'local').returns('local');
            class TestInstance extends Instance {
                get config() {
                    return {get: getStub};
                }
            }
            const testInstance = new TestInstance({}, {}, '');
            const testProcess = testInstance._process = {
                name: 'local',
                a: 'b',
                foo: 'bar',
                test: true
            };

            const proc = testInstance.process;
            expect(proc).to.deep.equal(testProcess);
            expect(getStub.calledOnce).to.be.true;
        });

        it('loads new instance if cached one is available but the name is different', function () {
            const getStub = sinon.stub().withArgs('process', 'local').returns('local');
            const procManagerStub = sinon.stub().withArgs('local').returns({Class: ProcessManager});
            class TestInstance extends Instance {
                get config() {
                    return {get: getStub};
                }
            }
            const testInstance = new TestInstance({}, {
                getProcessManager: procManagerStub
            }, '');
            testInstance._process = {name: 'systemd'};

            const proc = testInstance.process;
            expect(proc).to.be.an.instanceof(ProcessManager);
            expect(testInstance._process).to.deep.equal(proc);
            expect(getStub.calledOnce).to.be.true;
            expect(procManagerStub.calledOnce).to.be.true;
        });
    });

    it('version getter/setter works', testConfigAccessors('version', 'active-version'));
    it('cliVersion getter/setter works', testConfigAccessors('cliVersion', 'cli-version'));
    it('previousVersion getter/setter works', testConfigAccessors('previousVersion', 'previous-version'));

    it('isSetup accessor works', function () {
        const hasInstance = sinon.stub();
        hasInstance.onFirstCall().returns(true);
        hasInstance.onSecondCall().returns(false);

        const instance = new Instance({}, {hasInstance}, '/dir/a');

        expect(instance.isSetup).to.be.true;
        expect(hasInstance.calledOnce).to.be.true;
        expect(hasInstance.calledWithExactly(instance)).to.be.true;

        expect(instance.isSetup).to.be.false;
        expect(hasInstance.calledTwice).to.be.true;
    });

    it('sets up instance vars in constructor', function () {
        const testInstance = new Instance({ui: true}, {system: true}, 'some_test_dir');
        expect(testInstance.ui).to.deep.equal({ui: true});
        expect(testInstance.system).to.deep.equal({system: true});
        expect(testInstance.dir).to.equal('some_test_dir');
        expect(testInstance._cliConfig).to.be.an.instanceof(Config);
    });

    describe('running', function () {
        it('sets running property in cliConfig', function () {
            const setStub = sinon.stub().withArgs('running', 'testing').returnsThis();
            const saveStub = sinon.stub();
            const testInstance = new Instance({}, {}, '');
            testInstance._cliConfig = {set: setStub, save: saveStub};

            return testInstance.running('testing').then(() => {
                expect(setStub.calledOnce).to.be.true;
                expect(saveStub.calledOnce).to.be.true;
            });
        });

        it('returns false if running property not set in config & neither config exists', function () {
            const hasStub = sinon.stub().withArgs('running').returns(false);
            const setEnvironmentStub = sinon.stub();
            const testInstance = new Instance({}, {development: true, setEnvironment: setEnvironmentStub}, '');
            testInstance._cliConfig = {has: hasStub};
            const existsStub = sinon.stub(Config, 'exists').returns(false);

            return testInstance.running().then((running) => {
                expect(running).to.be.false;
                expect(hasStub.calledOnce).to.be.true;
                expect(existsStub.calledTwice).to.be.true;
                expect(setEnvironmentStub.calledOnce).to.be.true;
                expect(setEnvironmentStub.calledWithExactly(true)).to.be.true;
            });
        });

        it('queries process manager in production if running not set and prod config exists', function () {
            const configStub = createConfigStub();
            const isRunningStub = sinon.stub().returns(true);
            class TestInstance extends Instance {
                get process() {
                    return {isRunning: isRunningStub};
                }
            }

            const setEnvironmentStub = sinon.stub();
            const testInstance = new TestInstance({}, {setEnvironment: setEnvironmentStub}, '/var/www/ghost');
            testInstance._cliConfig = configStub;

            const existsStub = sinon.stub(Config, 'exists').returns(true);

            return testInstance.running().then((running) => {
                expect(running).to.be.true;
                expect(configStub.has.calledOnce).to.be.true;
                expect(existsStub.calledOnce).to.be.true;
                expect(existsStub.calledWithExactly('/var/www/ghost/config.production.json')).to.be.true;
                expect(isRunningStub.calledOnce).to.be.true;
                expect(configStub.set.calledOnce).to.be.true;
                expect(configStub.set.calledWithExactly('running', 'production')).to.be.true;
                expect(configStub.save.calledOnce).to.be.true;
            });
        });

        it('queries process manager in dev if prod config not exists and dev config does', function () {
            const configStub = createConfigStub();
            const isRunningStub = sinon.stub().returns(true);
            class TestInstance extends Instance {
                get process() {
                    return {isRunning: isRunningStub};
                }
            }

            const setEnvironmentStub = sinon.stub();
            const testInstance = new TestInstance({}, {setEnvironment: setEnvironmentStub}, '/var/www/ghost');
            testInstance._cliConfig = configStub;

            const existsStub = sinon.stub(Config, 'exists');

            existsStub.onFirstCall().returns(false);
            existsStub.onSecondCall().returns(true);

            return testInstance.running().then((running) => {
                expect(running).to.be.true;
                expect(configStub.has.calledOnce).to.be.true;
                expect(existsStub.calledTwice).to.be.true;
                expect(existsStub.calledWithExactly('/var/www/ghost/config.production.json')).to.be.true;
                expect(existsStub.calledWithExactly('/var/www/ghost/config.development.json')).to.be.true;
                expect(isRunningStub.calledOnce).to.be.true;
                expect(configStub.set.calledOnce).to.be.true;
                expect(configStub.set.calledWithExactly('running', 'development')).to.be.true;
                expect(configStub.save.calledOnce).to.be.true;
            });
        });

        it('queries process manager in dev if not running in prod and dev config exists', function () {
            const configStub = createConfigStub();
            const isRunningStub = sinon.stub();
            isRunningStub.onFirstCall().returns(false);
            isRunningStub.onSecondCall().returns(true);
            class TestInstance extends Instance {
                get process() {
                    return {isRunning: isRunningStub};
                }
            }

            const setEnvironmentStub = sinon.stub();
            const testInstance = new TestInstance({}, {setEnvironment: setEnvironmentStub}, '/var/www/ghost');
            testInstance._cliConfig = configStub;

            const existsStub = sinon.stub(Config, 'exists').returns(true);

            return testInstance.running().then((running) => {
                expect(running).to.be.true;
                expect(configStub.has.calledOnce).to.be.true;
                expect(existsStub.calledTwice).to.be.true;
                expect(existsStub.calledWithExactly('/var/www/ghost/config.production.json')).to.be.true;
                expect(existsStub.calledWithExactly('/var/www/ghost/config.development.json')).to.be.true;
                expect(isRunningStub.calledTwice).to.be.true;
                expect(configStub.set.calledOnce).to.be.true;
                expect(configStub.set.calledWithExactly('running', 'development')).to.be.true;
                expect(configStub.save.calledOnce).to.be.true;
            });
        });

        it('returns false if ghost isn\'t running in either environment', function () {
            const configStub = createConfigStub();
            const isRunningStub = sinon.stub().returns(false);
            class TestInstance extends Instance {
                get process() {
                    return {isRunning: isRunningStub};
                }
            }

            const setEnvironmentStub = sinon.stub();
            const testInstance = new TestInstance({}, {setEnvironment: setEnvironmentStub, development: false}, '/var/www/ghost');
            testInstance._cliConfig = configStub;

            const existsStub = sinon.stub(Config, 'exists').returns(true);

            return testInstance.running().then((running) => {
                expect(running).to.be.false;
                expect(configStub.has.calledOnce).to.be.true;
                expect(existsStub.calledTwice).to.be.true;
                expect(existsStub.calledWithExactly('/var/www/ghost/config.production.json')).to.be.true;
                expect(existsStub.calledWithExactly('/var/www/ghost/config.development.json')).to.be.true;
                expect(isRunningStub.calledTwice).to.be.true;
                expect(configStub.set.called).to.be.false;
                expect(configStub.save.called).to.be.false;
                expect(setEnvironmentStub.calledThrice).to.be.true;
                expect(setEnvironmentStub.args[2][0]).to.be.false;
            });
        });

        it('loads running environment and checks if process manager returns false', function () {
            const hasStub = sinon.stub().withArgs('running').returns(true);
            const isRunningStub = sinon.stub().returns(true);
            class TestInstance extends Instance {
                get process() {
                    return {isRunning: isRunningStub};
                }
            }
            const testInstance = new TestInstance({}, {}, '');
            const loadRunEnvStub = sinon.stub(testInstance, 'loadRunningEnvironment');
            testInstance._cliConfig = {has: hasStub};

            return testInstance.running().then((running) => {
                expect(running).to.be.true;
                expect(hasStub.calledOnce).to.be.true;
                expect(isRunningStub.calledOnce).to.be.true;
                expect(loadRunEnvStub.calledOnce).to.be.true;
            });
        });

        it('sets running to null in cliConfig if process manager\'s isRunning method returns false', function () {
            const hasStub = sinon.stub().withArgs('running').returns(true);
            const setStub = sinon.stub().withArgs('running', null).returnsThis();
            const saveStub = sinon.stub().returnsThis();
            const isRunningStub = sinon.stub().returns(false);
            class TestInstance extends Instance {
                get process() {
                    return {isRunning: isRunningStub};
                }
            }
            const testInstance = new TestInstance({}, {}, '');
            const loadRunEnvStub = sinon.stub(testInstance, 'loadRunningEnvironment');
            testInstance._cliConfig = {has: hasStub, set: setStub, save: saveStub};

            return testInstance.running().then((running) => {
                expect(running).to.be.false;
                expect(hasStub.calledOnce).to.be.true;
                expect(setStub.calledOnce).to.be.true;
                expect(saveStub.calledOnce).to.be.true;
                expect(isRunningStub.calledOnce).to.be.true;
                expect(loadRunEnvStub.calledOnce).to.be.true;
            });
        });
    });

    describe('checkEnvironment', function () {
        it('doesn\'t do anything if environment is not production', function () {
            const logStub = sinon.stub();
            const environmentStub = sinon.stub();
            const testInstance = new Instance({log: logStub}, {
                setEnvironment: environmentStub,
                production: false,
                environment: 'development'
            }, '');

            testInstance.checkEnvironment();
            expect(logStub.called).to.be.false;
            expect(environmentStub.called).to.be.false;
        });

        it('doesn\'t do anything if config.development.json doesn\'t exist', function () {
            const logStub = sinon.stub();
            const environmentStub = sinon.stub();
            const existsStub = sinon.stub(Config, 'exists').withArgs('/path/config.development.json').returns(false);
            const testInstance = new Instance({log: logStub}, {
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
            const logStub = sinon.stub();
            const environmentStub = sinon.stub();
            const testInstance = new Instance({log: logStub}, {
                setEnvironment: environmentStub,
                production: true,
                environment: 'production'
            }, '/path');

            const existsStub = sinon.stub(Config, 'exists');
            existsStub.withArgs('/path/config.development.json').returns(true);
            existsStub.withArgs('/path/config.production.json').returns(false);

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
            const getStub = sinon.stub().withArgs('running').returns(null);
            const testInstance = new Instance({}, {}, '');
            testInstance._cliConfig = {get: getStub};

            try {
                testInstance.loadRunningEnvironment();
                expect(true, 'should have thrown error').to.be.false;
            } catch (e) {
                expect(getStub.calledOnce).to.be.true;
                expect(e.message).to.match(/instance is not running/);
            }
        });

        it('calls setEnvironment and passes through variables', function () {
            const getStub = sinon.stub().withArgs('running').returns('development');
            const envStub = sinon.stub();
            const testInstance = new Instance({}, {
                setEnvironment: envStub
            }, '');
            testInstance._cliConfig = {get: getStub};

            testInstance.loadRunningEnvironment(false);
            expect(getStub.calledOnce).to.be.true;
            expect(envStub.calledOnce).to.be.true;
            expect(envStub.args[0]).to.deep.equal([true, false]);
        });
    });

    describe('summary', function () {
        it('returns shortened object if running is false', function () {
            const get = sinon.stub();
            get.withArgs('active-version').returns('1.0.0');
            get.withArgs('name').returns('testing');

            const testInstance = new Instance({}, {}, '');
            sinon.stub(testInstance, 'running').resolves(false);
            testInstance._cliConfig = {get};

            return testInstance.summary().then((result) => {
                expect(result.running).to.be.false;
                expect(result.name).to.equal('testing');
                expect(result.version).to.equal('1.0.0');
                expect(result.mode).to.be.undefined;
            });
        });

        it('loads running environment and returns full object if running is true', function () {
            const cliGetStub = sinon.stub();
            cliGetStub.withArgs('active-version').returns('1.0.0');
            cliGetStub.withArgs('name').returns('testing');

            const getStub = sinon.stub();
            getStub.withArgs('url').returns('localhost');
            getStub.withArgs('server.port').returns(1234);

            class TestInstance extends Instance {
                get name() {
                    return 'testing';
                }
                get config() {
                    return {get: getStub};
                }
                get process() {
                    return {name: 'local'};
                }
                running() {
                    return Promise.resolve(true);
                }
            }
            const testInstance = new TestInstance({}, {environment: 'testing'}, '');
            testInstance._cliConfig = {get: cliGetStub};

            return testInstance.summary().then((result) => {
                expect(result.running).to.be.true;
                expect(result.name).to.equal('testing');
                expect(result.mode).to.equal('testing');
                expect(result.url).to.equal('localhost');
            });
        });
    });
});
