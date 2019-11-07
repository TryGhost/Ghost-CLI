'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const os = require('os');
const modulePath = '../../lib/system';
const Instance = require('../../lib/instance');
const Config = require('../../lib/utils/config');

function stubGlobalConfig(SystemClass, configDefinition, ui, extensions) {
    class TestSystemClass extends SystemClass {
        get globalConfig() {
            return configDefinition;
        }
    }

    return new TestSystemClass(ui || {}, extensions || []);
}

describe('Unit: System', function () {
    afterEach(() => {
        sinon.restore();
    });

    it('cliVersion getter caches', function () {
        let counter = 0;
        const System = proxyquire(modulePath, {
            '../package.json': {
                get version() {
                    counter += 1;
                    return '1.0.0';
                }
            }
        });
        const systemInstance = new System({}, []);

        expect(systemInstance.cliVersion).to.equal('1.0.0');
        expect(counter).to.equal(1);
        // Do this twice to make sure it's cached
        expect(systemInstance.cliVersion).to.equal('1.0.0');
        expect(counter).to.equal(1);
    });

    it('globalConfig getter caches', function () {
        const ensureDirStub = sinon.stub();

        const System = proxyquire(modulePath, {
            'fs-extra': {ensureDirSync: ensureDirStub}
        });
        System.globalDir = '/home/user/.ghost';
        const systemInstance = new System({}, []);

        const config = systemInstance.globalConfig;
        expect(config).to.be.an.instanceof(Config);
        expect(ensureDirStub.calledOnce).to.be.true;
        expect(ensureDirStub.calledWithExactly('/home/user/.ghost')).to.be.true;

        const configTwo = systemInstance.globalConfig;
        expect(configTwo).to.be.an.instanceof(Config);
        expect(config).to.equal(configTwo);
    });

    describe('platform getter', function () {
        const System = require(modulePath);

        it('platform getter works for linux & caches', function () {
            const osStub = sinon.stub(os, 'platform').returns('linux');
            const instance = new System({}, []);
            const platform = instance.platform;

            expect(osStub.calledOnce).to.be.true;
            expect(platform).to.deep.equal({
                linux: true,
                macos: false,
                windows: false
            });

            const platform2 = instance.platform;

            expect(osStub.calledOnce).to.be.true;
            expect(platform2).to.deep.equal({
                linux: true,
                macos: false,
                windows: false
            });
        });

        it('platform getter works for macos', function () {
            const osStub = sinon.stub(os, 'platform').returns('darwin');
            const instance = new System({}, []);
            const platform = instance.platform;

            expect(osStub.calledOnce).to.be.true;
            expect(platform).to.deep.equal({
                linux: false,
                macos: true,
                windows: false
            });
        });

        it('platform getter works for windows', function () {
            const osStub = sinon.stub(os, 'platform').returns('win32');
            const instance = new System({}, []);
            const platform = instance.platform;

            expect(osStub.calledOnce).to.be.true;
            expect(platform).to.deep.equal({
                linux: false,
                macos: false,
                windows: true
            });
        });
    });

    it('operatingSystem getter', function () {
        const System = require(modulePath);
        const sys = new System({}, []);

        expect(sys.operatingSystem).to.deep.equal({});

        sys._osInfo = {
            platform: 'Linux',
            distro: 'Ubuntu',
            release: '18.04 LTS',
            kernel: 'kernel'
        };

        expect(sys.operatingSystem).to.deep.equal(sys._osInfo);
    });

    describe('setEnvironment', function () {
        it('sets things correctly in development', function () {
            const System = require(modulePath);
            const systemInstance = new System({}, []);
            const currentNodeEnv = process.env.NODE_ENV;

            process.env.NODE_ENV = 'testing';

            systemInstance.setEnvironment(true);

            expect(systemInstance.environment).to.equal('development');
            expect(systemInstance.development).to.be.true;
            expect(systemInstance.production).to.be.false;
            expect(process.env.NODE_ENV).to.equal('testing'); // node env is unchanged

            process.env.NODE_ENV = currentNodeEnv;
        });

        it('sets things correctly in production', function () {
            const System = require(modulePath);
            const systemInstance = new System({}, []);
            const currentNodeEnv = process.env.NODE_ENV;

            process.env.NODE_ENV = 'testing';

            systemInstance.setEnvironment(false);

            expect(systemInstance.environment).to.equal('production');
            expect(systemInstance.development).to.be.false;
            expect(systemInstance.production).to.be.true;
            expect(process.env.NODE_ENV).to.equal('testing'); // node env is unchanged

            process.env.NODE_ENV = currentNodeEnv;
        });

        it('sets NODE_ENV', function () {
            const System = require(modulePath);
            const systemInstance = new System({}, []);
            const currentNodeEnv = process.env.NODE_ENV;

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
            const System = require(modulePath);
            const systemInstance = new System({}, []);
            const cachedInstanceStub = sinon.stub(systemInstance, 'cachedInstance').returns({
                instance: true
            });

            expect(systemInstance.getInstance()).to.deep.equal({instance: true});
            expect(cachedInstanceStub.calledOnce).to.be.true;
            expect(cachedInstanceStub.calledWithExactly(process.cwd())).to.be.true;
        });

        it('returns null if instance is not in the global config', function () {
            const System = require(modulePath);
            const systemInstance = stubGlobalConfig(System, {get: () => null});
            const cachedInstanceStub = sinon.stub(systemInstance, 'cachedInstance');

            expect(systemInstance.getInstance('test')).to.be.null;
            expect(cachedInstanceStub.called).to.be.false;
        });

        it('fetches instance by instance name', function () {
            const System = require(modulePath);
            const systemInstance = stubGlobalConfig(System, {get: () => ({cwd: '/var/www/ghost'})});
            const cachedInstanceStub = sinon.stub(systemInstance, 'cachedInstance').returns({
                instance: true
            });

            expect(systemInstance.getInstance('test')).to.deep.equal({instance: true});
            expect(cachedInstanceStub.calledOnce).to.be.true;
            expect(cachedInstanceStub.calledWithExactly('/var/www/ghost')).to.be.true;
        });
    });

    describe('addInstance', function () {
        const System = require(modulePath);

        it('sets instance name to name of existing instance if cwd matches', function () {
            const saveStub = sinon.stub();
            const setStub = sinon.stub().returns({save: saveStub});
            const instances = {test: {cwd: '/some/dir'}};
            const systemInstance = stubGlobalConfig(System, {get: () => instances, set: setStub, save: saveStub});
            const instance = {name: 'test2', dir: '/some/dir'};
            systemInstance.addInstance(instance);

            expect(setStub.called).to.be.false;
            expect(saveStub.called).to.be.false;
            expect(instance.name).to.equal('test');
            expect(Object.keys(instances)).to.have.length(1);
        });

        it('uniqueifies the instance name', function () {
            const saveStub = sinon.stub();
            const setStub = sinon.stub().returns({save: saveStub});
            const instances = {test: {cwd: '/dir/a'}, 'test-1': {cwd: '/dir/b'}};
            const systemInstance = stubGlobalConfig(System, {get: () => instances, set: setStub});

            const instanceOne = {name: 'test', dir: '/dir/c'};
            const instanceTwo = {name: 'foo', dir: '/dir/d'};

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
        const System = require(modulePath);
        const saveStub = sinon.stub();
        const setStub = sinon.stub().returns({save: saveStub});
        const instances = {test: {cwd: '/dir/a'}, test2: {cwd: '/dir/b'}};
        const systemInstance = stubGlobalConfig(System, {get: () => instances, set: setStub});
        systemInstance.removeInstance({name: 'test2', dir: '/dir/b'});

        expect(setStub.calledOnce).to.be.true;
        expect(setStub.args[0][0]).to.equal('instances');
        expect(setStub.args[0][1]).to.deep.equal({
            test: {cwd: '/dir/a'}
        });
    });

    it('hasInstance works', function () {
        const System = require(modulePath);
        const system = new System({}, []);
        system.globalConfig.set('instances', {test: {cwd: '/dir/a'}, test2: {cwd: '/dir/c'}});
        const instanceA = new Instance({}, system, '/dir/a');
        instanceA._cliConfig.set('name', 'test');

        const instanceB = new Instance({}, system, '/dir/b');
        const instanceC = new Instance({}, system, '/dir/c');
        instanceC._cliConfig.set('name', 'different');

        expect(system.hasInstance(instanceA)).to.be.true;
        expect(system.hasInstance(instanceB)).to.be.false;
        expect(system.hasInstance(instanceC)).to.be.false;
    });

    it('cachedInstance loads instance and caches it', function () {
        const System = require(modulePath);
        const systemInstance = new System({ui: true}, []);
        const instance = systemInstance.cachedInstance('/dir/a');
        expect(instance).to.be.an.instanceof(Instance);
        expect(instance.dir).to.equal('/dir/a');

        const instanceTwo = systemInstance.cachedInstance('/dir/a');
        expect(instanceTwo).to.equal(instance);
        expect(instanceTwo.dir).to.equal('/dir/a');
    });

    describe('getAllInstances', function () {
        it('loads all running instances and removes nonexistent ones', function () {
            const fsStub = sinon.stub();
            const saveStub = sinon.stub();
            const setStub = sinon.stub().returns({save: saveStub});
            fsStub.withArgs('/dir/a/.ghost-cli').returns(true);
            fsStub.withArgs('/dir/b/.ghost-cli').returns(true);
            fsStub.withArgs('/dir/c/.ghost-cli').returns(false);

            const System = proxyquire(modulePath, {
                'fs-extra': {existsSync: fsStub}
            });
            const instances = {
                testa: {cwd: '/dir/a'},
                testb: {cwd: '/dir/b'},
                testc: {cwd: '/dir/c'}
            };
            const systemInstance = stubGlobalConfig(System, {get: () => instances, set: setStub});
            const getInstanceStub = sinon.stub(systemInstance, 'getInstance');

            const instanceA = {isRunning: () => Promise.resolve(true), cwd: '/dir/a', name: 'testa'};
            const instanceB = {isRunning: () => Promise.resolve(false), cwd: '/dir/b', name: 'testb'};

            getInstanceStub.withArgs('testa').returns(instanceA);
            getInstanceStub.withArgs('testb').returns(instanceB);

            return systemInstance.getAllInstances(true).then((result) => {
                expect(result).to.deep.equal([instanceA]);
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
        });

        it('loads all instances with running false', function () {
            const fsStub = sinon.stub();
            const saveStub = sinon.stub();
            const setStub = sinon.stub().returns({save: saveStub});
            fsStub.withArgs('/dir/a/.ghost-cli').returns(true);
            fsStub.withArgs('/dir/b/.ghost-cli').returns(true);

            const System = proxyquire(modulePath, {
                'fs-extra': {existsSync: fsStub}
            });
            const instances = {
                testa: {cwd: '/dir/a'},
                testb: {cwd: '/dir/b'}
            };
            const systemInstance = stubGlobalConfig(System, {get: () => instances, set: setStub});
            const getInstanceStub = sinon.stub(systemInstance, 'getInstance');

            const instanceA = {isRunning: () => Promise.resolve(true), cwd: '/dir/a', name: 'testa'};
            const instanceB = {isRunning: () => Promise.resolve(false), cwd: '/dir/b', name: 'testb'};

            getInstanceStub.withArgs('testa').returns(instanceA);
            getInstanceStub.withArgs('testb').returns(instanceB);

            return systemInstance.getAllInstances(false).then((result) => {
                expect(result).to.deep.equal([instanceA, instanceB]);
                expect(fsStub.calledTwice).to.be.true;
                expect(getInstanceStub.calledTwice).to.be.true;
                expect(setStub.called).to.be.false;
            });
        });
    });

    describe('hook', function () {
        it('errors if hook name not provided', function () {
            const System = require(modulePath);
            const systemInstance = new System({}, []);

            return systemInstance.hook().then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(Error);
                expect(error.message).to.equal('Hook name must be supplied.');
            });
        });

        it('calls extensions with promises and passes args correctly', function () {
            const getInstanceStub = sinon.spy((ui, system, ext) => ext);
            const System = proxyquire(modulePath, {
                './extension': {getInstance: getInstanceStub}
            });

            const hook1 = sinon.stub().resolves('a');
            const hook2 = sinon.stub().resolves('b');

            const extensionOne = {setup: hook1};
            const extensionTwo = {};
            const extensionThree = {setup: hook2};
            const extensions = [extensionOne, extensionTwo, extensionThree];

            const systemInstance = new System({}, extensions);

            return systemInstance.hook('setup', {arg1: true}, {arg2: true}).then((results) => {
                expect(results).to.deep.equal(['a', undefined, 'b']);
                expect(getInstanceStub.calledThrice).to.be.true;
                expect(hook1.calledOnce).to.be.true;
                expect(hook1.calledWithExactly({arg1: true}, {arg2: true})).to.be.true;
                expect(hook2.calledOnce).to.be.true;
                expect(hook2.calledWithExactly({arg1: true}, {arg2: true})).to.be.true;
            });
        });
    });

    describe('getProcessManager', function () {
        it('returns local process manager if name is not defined', function () {
            const System = proxyquire(modulePath, {
                './utils/local-process': {localProcessManager: true}
            });
            const systemInstance = new System({}, []);

            const processManager = systemInstance.getProcessManager();
            expect(processManager.Class).to.deep.equal({localProcessManager: true});
            expect(processManager.name).to.equal('local');
        });

        it('returns local process manager if name is local', function () {
            const System = proxyquire(modulePath, {
                './utils/local-process': {localProcessManager: true}
            });
            const systemInstance = new System({}, []);

            const processManager = systemInstance.getProcessManager('local');
            expect(processManager.Class).to.deep.equal({localProcessManager: true});
            expect(processManager.name).to.equal('local');
        });

        it('returns local process manager process manager does not exist', function () {
            const System = proxyquire(modulePath, {
                './utils/local-process': {localProcessManager: true}
            });
            const logStub = sinon.stub();
            const systemInstance = new System({log: logStub}, []);
            const availableStub = sinon.stub(systemInstance, '_getAvailableProcessManagers')
                .returns({
                    systemd: '../extensions/systemd/systemd.js'
                });

            const processManager = systemInstance.getProcessManager('pm2');
            expect(processManager.Class).to.deep.equal({localProcessManager: true});
            expect(processManager.name).to.equal('local');
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/'pm2' does not exist/);
            expect(availableStub.calledOnce).to.be.true;
        });

        it('returns local process manager if discovered process manager does not inherit from process', function () {
            const System = proxyquire(modulePath, {
                './utils/local-process': {localProcessManager: true}
            });
            const logStub = sinon.stub();
            const systemInstance = new System({log: logStub}, []);
            const availableStub = sinon.stub(systemInstance, '_getAvailableProcessManagers')
                .returns({
                    test: '../test/fixtures/classes/test-invalid-process'
                });

            const processManager = systemInstance.getProcessManager('test');
            expect(processManager.Class).to.deep.equal({localProcessManager: true});
            expect(processManager.name).to.equal('local');
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/does not inherit from base/);
            expect(availableStub.calledOnce).to.be.true;
        });

        it('returns local process manager if discovered process manager is missing methods', function () {
            const System = proxyquire(modulePath, {
                './utils/local-process': {localProcessManager: true}
            });
            const logStub = sinon.stub();
            const systemInstance = new System({log: logStub}, []);
            const availableStub = sinon.stub(systemInstance, '_getAvailableProcessManagers')
                .returns({
                    test: '../test/fixtures/classes/test-process-missing-methods'
                });

            const processManager = systemInstance.getProcessManager('test');
            expect(processManager.Class).to.deep.equal({localProcessManager: true});
            expect(processManager.name).to.equal('local');
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/missing required fields/);
            expect(availableStub.calledOnce).to.be.true;
        });

        it('returns local process manager if discovered process manager wont run on the system', function () {
            const isValidStub = sinon.stub().returns(true);
            const System = proxyquire(modulePath, {
                './utils/local-process': {localProcessManager: true},
                './process-manager': {isValid: isValidStub}
            });
            const logStub = sinon.stub();
            const systemInstance = new System({log: logStub}, []);
            const availableStub = sinon.stub(systemInstance, '_getAvailableProcessManagers')
                .returns({
                    test: '../test/fixtures/classes/test-process-wont-run'
                });

            const processManager = systemInstance.getProcessManager('test');
            expect(processManager.Class).to.deep.equal({localProcessManager: true});
            expect(processManager.name).to.equal('local');
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/will not run on this system/);
            expect(availableStub.calledOnce).to.be.true;
            expect(isValidStub.calledOnce).to.be.true;
        });

        it('returns process manager class if is valid and will run', function () {
            const TestProcess = require('../fixtures/classes/test-valid-process');

            const isValidStub = sinon.stub().returns(true);
            const System = proxyquire(modulePath, {
                './utils/local-process': {localProcessManager: true},
                './process-manager': {isValid: isValidStub}
            });
            const logStub = sinon.stub();
            const systemInstance = new System({log: logStub}, []);
            const availableStub = sinon.stub(systemInstance, '_getAvailableProcessManagers')
                .returns({
                    test: '../test/fixtures/classes/test-valid-process'
                });

            const processManager = systemInstance.getProcessManager('test');
            expect(processManager.Class).to.equal(TestProcess);
            expect(processManager.name).to.equal('test');
            expect(logStub.called).to.be.false;
            expect(availableStub.calledOnce).to.be.true;
            expect(isValidStub.calledOnce).to.be.true;
        });
    });

    it('_getAvailableProcessManagers works', function () {
        const getInstanceStub = sinon.spy((ui, system, ext) => ext);
        const existsSyncStub = sinon.stub();
        const System = proxyquire(modulePath, {
            './extension': {getInstance: getInstanceStub},
            'fs-extra': {existsSync: existsSyncStub}
        });

        existsSyncStub.withArgs('./foo').returns(true);
        existsSyncStub.withArgs('./bar').returns(false);
        existsSyncStub.withArgs('./systemd').returns(true);

        const extensions = [
            {processManagers: {foo: './foo', bar: './bar'}},
            {processManagers: {systemd: './systemd'}}
        ];
        const systemInstance = new System({}, extensions);

        expect(systemInstance._getAvailableProcessManagers()).to.deep.equal({
            foo: './foo',
            systemd: './systemd'
        });
        expect(getInstanceStub.calledTwice).to.be.true;
    });

    it('loadOsInfo returns if info already loaded', async function () {
        const osInfo = sinon.stub().rejects();
        const System = proxyquire(modulePath, {
            'systeminformation/lib/osinfo': {osInfo}
        });

        const sys = new System({}, []);
        sys._osInfo = {distro: 'Mac OS X', release: '10.15'};

        await sys.loadOsInfo();
        expect(osInfo.called).to.be.false;
    });

    it('loadOsInfo loads operating system information', async function () {
        const osInfo = sinon.stub().resolves({distro: 'Windows', release: '10'});
        const System = proxyquire(modulePath, {
            'systeminformation/lib/osinfo': {osInfo}
        });

        const sys = new System({}, []);

        await sys.loadOsInfo();
        expect(osInfo.calledOnce).to.be.true;
        expect(sys._osInfo).to.deep.equal({distro: 'Windows', release: '10'});
    });

    it('writeErrorLog works', function () {
        const ensureDirStub = sinon.stub();
        const writeFileStub = sinon.stub();

        const System = proxyquire(modulePath, {
            'fs-extra': {ensureDirSync: ensureDirStub, writeFileSync: writeFileStub}
        });
        System.globalDir = '/global/dir';
        const systemInstance = new System({}, []);

        systemInstance.writeErrorLog('heres an error');
        expect(ensureDirStub.calledOnce).to.be.true;
        expect(ensureDirStub.calledWithExactly('/global/dir/logs')).to.be.true;
        expect(writeFileStub.calledOnce).to.be.true;
        expect(writeFileStub.args[0][0]).to.match(/global\/dir\/logs\/ghost-cli-debug-(.*).log/);
        expect(writeFileStub.args[0][1]).to.equal('heres an error');
    });
});
