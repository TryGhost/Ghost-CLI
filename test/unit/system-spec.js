'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const modulePath = '../../lib/system';
const Instance = require('../../lib/instance');
const Config = require('../../lib/utils/config');
const Process = require('../../lib/process-manager');

function stubGlobalConfig(SystemClass, configDefinition, ui, extensions) {
    class TestSystemClass extends SystemClass {
        get globalConfig() {
            return configDefinition;
        }
    }

    return new TestSystemClass(ui || {}, extensions || []);
}

describe('Unit: System', function () {
    it('cliVersion getter caches', function () {
        let counter = 0;
        let System = proxyquire(modulePath, {
            '../package.json': {
                get version() {
                    counter += 1;
                    return '1.0.0';
                }
            }
        });
        let systemInstance = new System({}, []);

        expect(systemInstance.cliVersion).to.equal('1.0.0');
        expect(counter).to.equal(1);
        // Do this twice to make sure it's cached
        expect(systemInstance.cliVersion).to.equal('1.0.0');
        expect(counter).to.equal(1);
    });

    it('globalConfig getter caches', function () {
        let ensureDirStub = sinon.stub();

        let System = proxyquire(modulePath, {
            'fs-extra': { ensureDirSync: ensureDirStub }
        });
        System.globalDir = '/home/user/.ghost';
        let systemInstance = new System({}, []);

        let config = systemInstance.globalConfig;
        expect(config).to.be.an.instanceof(Config);
        expect(ensureDirStub.calledOnce).to.be.true;
        expect(ensureDirStub.calledWithExactly('/home/user/.ghost')).to.be.true;

        let configTwo = systemInstance.globalConfig;
        expect(configTwo).to.be.an.instanceof(Config);
        expect(config).to.equal(configTwo);
    });

    describe('setEnvironment', function () {
        it('sets things correctly in development', function () {
            let System = require(modulePath);
            let systemInstance = new System({}, []);
            let currentNodeEnv = process.env.NODE_ENV;

            process.env.NODE_ENV = 'testing';

            systemInstance.setEnvironment(true);

            expect(systemInstance.environment).to.equal('development');
            expect(systemInstance.development).to.be.true;
            expect(systemInstance.production).to.be.false;
            expect(process.env.NODE_ENV).to.equal('testing'); // node env is unchanged

            process.env.NODE_ENV = currentNodeEnv;
        });

        it('sets things correctly in production', function () {
            let System = require(modulePath);
            let systemInstance = new System({}, []);
            let currentNodeEnv = process.env.NODE_ENV;

            process.env.NODE_ENV = 'testing';

            systemInstance.setEnvironment(false);

            expect(systemInstance.environment).to.equal('production');
            expect(systemInstance.development).to.be.false;
            expect(systemInstance.production).to.be.true;
            expect(process.env.NODE_ENV).to.equal('testing'); // node env is unchanged

            process.env.NODE_ENV = currentNodeEnv;
        });

        it('sets NODE_ENV', function () {
            let System = require(modulePath);
            let systemInstance = new System({}, []);
            let currentNodeEnv = process.env.NODE_ENV;

            process.env.NODE_ENV = 'testing';

            systemInstance.setEnvironment(true, true);

            expect(systemInstance.environment).to.equal('development');
            expect(systemInstance.development).to.be.true;
            expect(systemInstance.production).to.be.false;
            expect(process.env.NODE_ENV).to.equal('development');

            process.env.NODE_ENV = currentNodeEnv;
        });
    });

    describe('getInstance', function () {
        it('fetches instance by cwd if name not passed', function () {
            let System = require(modulePath);
            let systemInstance = new System({}, []);
            let cachedInstanceStub = sinon.stub(systemInstance, 'cachedInstance').returns({
                instance: true
            });

            expect(systemInstance.getInstance()).to.deep.equal({ instance: true });
            expect(cachedInstanceStub.calledOnce).to.be.true;
            expect(cachedInstanceStub.calledWithExactly(process.cwd())).to.be.true;
        });

        it('returns null if instance is not in the global config', function () {
            let System = require(modulePath);
            let systemInstance = stubGlobalConfig(System, { get: () => null });
            let cachedInstanceStub = sinon.stub(systemInstance, 'cachedInstance');

            expect(systemInstance.getInstance('test')).to.be.null;
            expect(cachedInstanceStub.called).to.be.false;
        });

        it('fetches instance by instance name', function () {
            let System = require(modulePath);
            let systemInstance = stubGlobalConfig(System, { get: () => ({ cwd: '/var/www/ghost' }) });
            let cachedInstanceStub = sinon.stub(systemInstance, 'cachedInstance').returns({
                instance: true
            });

            expect(systemInstance.getInstance('test')).to.deep.equal({ instance: true });
            expect(cachedInstanceStub.calledOnce).to.be.true;
            expect(cachedInstanceStub.calledWithExactly('/var/www/ghost')).to.be.true;
        });
    });

    describe('addInstance', function () {
        let System = require(modulePath);

        it('sets instance name to name of existing instance if cwd matches', function () {
            let saveStub = sinon.stub();
            let setStub = sinon.stub().returns({ save: saveStub });
            let instances = {test: {cwd: '/some/dir'}};
            let systemInstance = stubGlobalConfig(System, { get: () => instances, set: setStub, save: saveStub });
            let instance = { name: 'test2', dir: '/some/dir' };
            systemInstance.addInstance(instance);

            expect(setStub.called).to.be.false;
            expect(saveStub.called).to.be.false;
            expect(instance.name).to.equal('test');
            expect(Object.keys(instances)).to.have.length(1);
        });

        it('uniqueifies the instance name', function () {
            let saveStub = sinon.stub();
            let setStub = sinon.stub().returns({ save: saveStub });
            let instances = {test: {cwd: '/dir/a'}, 'test-1': {cwd: '/dir/b'}};
            let systemInstance = stubGlobalConfig(System, { get: () => instances, set: setStub });

            let instanceOne = { name: 'test', dir: '/dir/c' };
            let instanceTwo = { name: 'foo', dir: '/dir/d' };

            systemInstance.addInstance(instanceOne);

            expect(instanceOne.name).to.equal('test-2');
            expect(setStub.calledOnce).to.be.true;
            expect(setStub.calledWithExactly('instances.test-2', {cwd: '/dir/c'}));
            expect(saveStub.calledOnce).to.be.true;

            systemInstance.addInstance(instanceTwo);
            expect(instanceTwo.name).to.equal('foo');
            expect(setStub.calledTwice).to.be.true;
            expect(setStub.calledWithExactly('instances.foo', {cwd: '/dir/d'}));
            expect(saveStub.calledTwice).to.be.true;
        });
    });

    it('removeInstance removes instance correctly', function () {
        let System = require(modulePath);
        let saveStub = sinon.stub();
        let setStub = sinon.stub().returns({ save: saveStub });
        let instances = {test: {cwd: '/dir/a'}, test2: {cwd: '/dir/b'}};
        let systemInstance = stubGlobalConfig(System, { get: () => instances, set: setStub });
        systemInstance.removeInstance({name: 'test2', dir: '/dir/b'});

        expect(setStub.calledOnce).to.be.true;
        expect(setStub.args[0][0]).to.equal('instances');
        expect(setStub.args[0][1]).to.deep.equal({
            test: {cwd: '/dir/a'}
        });
    });

    it('cachedInstance loads instance and caches it', function () {
        let System = require(modulePath);
        let systemInstance = new System({ui: true}, []);
        let instance = systemInstance.cachedInstance('/dir/a');
        expect(instance).to.be.an.instanceof(Instance);
        expect(instance.dir).to.equal('/dir/a');

        let instanceTwo = systemInstance.cachedInstance('/dir/a');
        expect(instanceTwo).to.equal(instance);
        expect(instanceTwo.dir).to.equal('/dir/a');
    });

    describe('getAllInstances', function () {
        it('loads all running instances and removes nonexistent ones', function () {
            let fsStub = sinon.stub();
            let saveStub = sinon.stub();
            let setStub = sinon.stub().returns({save: saveStub});
            fsStub.withArgs('/dir/a/.ghost-cli').returns(true);
            fsStub.withArgs('/dir/b/.ghost-cli').returns(true);
            fsStub.withArgs('/dir/c/.ghost-cli').returns(false);

            let System = proxyquire(modulePath, {
                'fs-extra': {existsSync: fsStub}
            });
            let instances = {
                testa: {cwd: '/dir/a'},
                testb: {cwd: '/dir/b'},
                testc: {cwd: '/dir/c'}
            };
            let systemInstance = stubGlobalConfig(System, {get: () => instances, set: setStub});
            let getInstanceStub = sinon.stub(systemInstance, 'getInstance');

            getInstanceStub.withArgs('testa').returns({running: true, cwd: '/dir/a', name: 'testa'});
            getInstanceStub.withArgs('testb').returns({running: false, cwd: '/dir/b', name: 'testb'});

            let result = systemInstance.getAllInstances(true);

            expect(result).to.deep.equal([
                {running: true, cwd: '/dir/a', name: 'testa'}
            ]);
            expect(fsStub.calledThrice).to.be.true;
            expect(getInstanceStub.calledTwice).to.be.true;
            expect(setStub.calledOnce).to.be.true;
            expect(setStub.args[0]).to.deep.equal([
                'instances',
                {
                    testa: {cwd: '/dir/a'},
                    testb: {cwd: '/dir/b'}
                }
            ]);
        });

        it('loads all instances with running false', function () {
            let fsStub = sinon.stub();
            let saveStub = sinon.stub();
            let setStub = sinon.stub().returns({save: saveStub});
            fsStub.withArgs('/dir/a/.ghost-cli').returns(true);
            fsStub.withArgs('/dir/b/.ghost-cli').returns(true);

            let System = proxyquire(modulePath, {
                'fs-extra': {existsSync: fsStub}
            });
            let instances = {
                testa: {cwd: '/dir/a'},
                testb: {cwd: '/dir/b'}
            };
            let systemInstance = stubGlobalConfig(System, {get: () => instances, set: setStub});
            let getInstanceStub = sinon.stub(systemInstance, 'getInstance');

            getInstanceStub.withArgs('testa').returns({running: true, cwd: '/dir/a', name: 'testa'});
            getInstanceStub.withArgs('testb').returns({running: false, cwd: '/dir/b', name: 'testb'});

            let result = systemInstance.getAllInstances(false);

            expect(result).to.deep.equal([
                {running: true, cwd: '/dir/a', name: 'testa'},
                {running: false, cwd: '/dir/b', name: 'testb'}
            ]);
            expect(fsStub.calledTwice).to.be.true;
            expect(getInstanceStub.calledTwice).to.be.true;
            expect(setStub.called).to.be.false;
        });
    });

    describe('hook', function () {
        it('errors if hook name not provided', function () {
            let System = require(modulePath);
            let systemInstance = new System({}, []);

            return systemInstance.hook().then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(Error);
                expect(error.message).to.equal('Hook name must be supplied.');
            });
        });

        it('calls extensions with promises and passes args correctly', function () {
            let getInstanceStub = sinon.spy((ui, system, ext) => ext);
            let System = proxyquire(modulePath, {
                './extension': {getInstance: getInstanceStub}
            });

            let setupHookStub = sinon.stub().resolves();

            let extensionOne = {setup: setupHookStub};
            let extensionTwo = {};
            let extensions = [extensionOne, extensionTwo];

            let systemInstance = new System({}, extensions);

            return systemInstance.hook('setup', {arg1: true}, {arg2: true}).then(() => {
                expect(getInstanceStub.calledTwice).to.be.true;
                expect(setupHookStub.calledOnce).to.be.true;
                expect(setupHookStub.calledWithExactly({arg1: true}, {arg2: true})).to.be.true;
            });
        });
    });

    describe('getProcessManager', function () {
        it('returns local process manager if name is not defined', function () {
            let System = proxyquire(modulePath, {
                './utils/local-process': {localProcessManager: true}
            });
            let systemInstance = new System({}, []);

            let processManager = systemInstance.getProcessManager();
            expect(processManager.Class).to.deep.equal({localProcessManager: true});
            expect(processManager.name).to.equal('local');
        });

        it('returns local process manager if name is local', function () {
            let System = proxyquire(modulePath, {
                './utils/local-process': {localProcessManager: true}
            });
            let systemInstance = new System({}, []);

            let processManager = systemInstance.getProcessManager('local');
            expect(processManager.Class).to.deep.equal({localProcessManager: true});
            expect(processManager.name).to.equal('local');
        });

        it('returns local process manager process manager does not exist', function () {
            let System = proxyquire(modulePath, {
                './utils/local-process': {localProcessManager: true}
            });
            let logStub = sinon.stub();
            let systemInstance = new System({log: logStub}, []);
            let availableStub = sinon.stub(systemInstance, '_getAvailableProcessManagers')
                .returns({
                    systemd: '../extensions/systemd/systemd.js'
                });

            let processManager = systemInstance.getProcessManager('pm2');
            expect(processManager.Class).to.deep.equal({localProcessManager: true});
            expect(processManager.name).to.equal('local');
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/\'pm2\' does not exist/);
            expect(availableStub.calledOnce).to.be.true;
        });

        it('returns local process manager if discovered process manager does not inherit from process', function () {
            class TestProcess {}

            let System = proxyquire(modulePath, {
                './utils/local-process': {localProcessManager: true},
                './test-process': TestProcess
            });
            let logStub = sinon.stub();
            let systemInstance = new System({log: logStub}, []);
            let availableStub = sinon.stub(systemInstance, '_getAvailableProcessManagers')
                .returns({
                    test: './test-process'
                });

            let processManager = systemInstance.getProcessManager('test');
            expect(processManager.Class).to.deep.equal({localProcessManager: true});
            expect(processManager.name).to.equal('local');
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/does not inherit from base/);
            expect(availableStub.calledOnce).to.be.true;
        });

        it('returns local process manager if discovered process manager is missing methods', function () {
            class TestProcess extends Process {}

            let System = proxyquire(modulePath, {
                './utils/local-process': {localProcessManager: true},
                './test-process': TestProcess
            });
            let logStub = sinon.stub();
            let systemInstance = new System({log: logStub}, []);
            let availableStub = sinon.stub(systemInstance, '_getAvailableProcessManagers')
                .returns({
                    test: './test-process'
                });

            let processManager = systemInstance.getProcessManager('test');
            expect(processManager.Class).to.deep.equal({localProcessManager: true});
            expect(processManager.name).to.equal('local');
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/missing required fields/);
            expect(availableStub.calledOnce).to.be.true;
        });

        it('returns local process manager if discovered process manager wont run on the system', function () {
            class TestProcess extends Process {
                static willRun() {
                    return false;
                }
            }

            let isValidStub = sinon.stub().returns(true);
            let System = proxyquire(modulePath, {
                './utils/local-process': {localProcessManager: true},
                './test-process': TestProcess,
                './process-manager': {isValid: isValidStub}
            });
            let logStub = sinon.stub();
            let systemInstance = new System({log: logStub}, []);
            let availableStub = sinon.stub(systemInstance, '_getAvailableProcessManagers')
                .returns({
                    test: './test-process'
                });

            let processManager = systemInstance.getProcessManager('test');
            expect(processManager.Class).to.deep.equal({localProcessManager: true});
            expect(processManager.name).to.equal('local');
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/will not run on this system/);
            expect(availableStub.calledOnce).to.be.true;
            expect(isValidStub.calledOnce).to.be.true;
        });

        it('returns process manager class if is valid and will run', function () {
            class TestProcess extends Process {
                static willRun() {
                    return true;
                }
            }

            let isValidStub = sinon.stub().returns(true);
            let System = proxyquire(modulePath, {
                './utils/local-process': {localProcessManager: true},
                './test-process': TestProcess,
                './process-manager': {isValid: isValidStub}
            });
            let logStub = sinon.stub();
            let systemInstance = new System({log: logStub}, []);
            let availableStub = sinon.stub(systemInstance, '_getAvailableProcessManagers')
                .returns({
                    test: './test-process'
                });

            let processManager = systemInstance.getProcessManager('test');
            expect(processManager.Class).to.equal(TestProcess);
            expect(processManager.name).to.equal('test');
            expect(logStub.called).to.be.false;
            expect(availableStub.calledOnce).to.be.true;
            expect(isValidStub.calledOnce).to.be.true;
        });
    });

    it('_getAvailableProcessManagers works', function () {
        let getInstanceStub = sinon.spy((ui, system, ext) => ext);
        let existsSyncStub = sinon.stub();
        let System = proxyquire(modulePath, {
            './extension': {getInstance: getInstanceStub},
            'fs-extra': {existsSync: existsSyncStub}
        });

        existsSyncStub.withArgs('./foo').returns(true);
        existsSyncStub.withArgs('./bar').returns(false);
        existsSyncStub.withArgs('./systemd').returns(true);

        let extensions = [
            {processManagers: {foo: './foo', bar: './bar'}},
            {processManagers: {systemd: './systemd'}}
        ];
        let systemInstance = new System({}, extensions);

        expect(systemInstance._getAvailableProcessManagers()).to.deep.equal({
            foo: './foo',
            systemd: './systemd'
        });
        expect(getInstanceStub.calledTwice).to.be.true;
    });

    it('writeErrorLog works', function () {
        let ensureDirStub = sinon.stub();
        let writeFileStub = sinon.stub();

        let System = proxyquire(modulePath, {
            'fs-extra': {ensureDirSync: ensureDirStub, writeFileSync: writeFileStub}
        });
        System.globalDir = '/global/dir';
        let systemInstance = new System({}, []);

        systemInstance.writeErrorLog('heres an error');
        expect(ensureDirStub.calledOnce).to.be.true;
        expect(ensureDirStub.calledWithExactly('/global/dir/logs')).to.be.true;
        expect(writeFileStub.calledOnce).to.be.true;
        expect(writeFileStub.args[0][0]).to.match(/global\/dir\/logs\/ghost-cli-debug-(.*).log/);
        expect(writeFileStub.args[0][1]).to.equal('heres an error');
    });
});
