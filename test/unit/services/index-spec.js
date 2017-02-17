'use strict';
const expect = require('chai').expect;
const rewire = require('rewire');
const sinon = require('sinon');

const BaseService = require('../../../lib/services/base');
const BaseProcess = require('../../../lib/services/process/base');

const ServiceManager = rewire('../../../lib/services');

describe('Unit: ServiceManager', function () {
    let sandbox;
    let originalKnownServices = [];

    before(function () {
        sandbox = sinon.sandbox.create();
    });

    beforeEach(function () {
        originalKnownServices = ServiceManager.knownServices;
        ServiceManager.knownServices = [];
    });

    afterEach(function () {
        sandbox.restore();
        ServiceManager.knownServices = originalKnownServices;
    });

    describe('#load', function () {
        it('returns a ServiceManager instance', function () {
            let config = {config: true};
            let ui = {ui: true};

            let result = ServiceManager.load(config, ui);

            expect(result).to.be.an.instanceOf(ServiceManager);
            expect(result.config).to.deep.equal(config);
            expect(result.ui).to.deep.equal(ui);
        });

        it('throws error if a service does not extend BaseService', function () {
            let dummyService = {
                name: 'test',
                class: class DummyService {}
            };

            ServiceManager.knownServices = [dummyService];

            try {
                ServiceManager.load();
                expect(false, 'load should throw if service doesn\'t extend BaseService').to.be.true;
            } catch (error) {
                expect(error.message).to.match(/does not inherit/);
            }
        });

        it('calls _loadService with a basic service', function () {
            let _loadService = sandbox.stub(ServiceManager.prototype, '_loadService');

            let dummyService = {
                name: 'test',
                class: class DummyService extends BaseService {}
            };

            ServiceManager.knownServices = [dummyService];
            ServiceManager.load();

            expect(_loadService.calledOnce, '_loadService was called').to.be.true;
        });

        it('calls _loadProcess if service type is set to \'process\'', function () {
            let _loadProcess = sandbox.stub(ServiceManager.prototype, '_loadProcess');
            let _loadService = sandbox.stub(ServiceManager.prototype, '_loadService');

            let dummyService = {
                name: 'test',
                class: class DummyService extends BaseService {},
                type: 'process'
            };

            ServiceManager.knownServices = [dummyService];
            ServiceManager.load();
            expect(_loadProcess.calledOnce, 'loadProcess was called').to.be.true;
            expect(_loadService.called, 'loadService was called').to.be.false;
        });
    });

    describe('#loadService', function () {
        it('returns the instantiated service', function () {
            let init = sinon.spy();
            let sm = new ServiceManager();
            let Service = class DummyService extends BaseService {
                constructor(serviceManager) {
                    super(serviceManager);
                    expect(serviceManager).to.deep.equal(sm);
                }

                init() {init();}
            };

            let result = sm._loadService('test', Service);

            expect(result).to.be.an.instanceOf(Service);
            expect(result.name, 'service name property').to.equal('test');
            expect(init.calledOnce, 'service init method was called').to.be.true;
        });

        it('throws error if two services with the same name are loaded', function () {
            let init = sinon.spy();
            let sm = new ServiceManager();
            let Service1 = class DummyService1 extends BaseService {
                init() {init();}
            }
            let Service2 = class DummyService2 extends BaseService {}

            try {
                sm._loadService('test', Service1);
                sm._loadService('test', Service2);
                expect(false, '_loadService should throw if two same-named services are loaded').to.be.true;
            } catch (error) {
                expect(error.message).to.match(/Service already exists/);
                expect(init.calledOnce).to.be.true;
            }
        });
    });

    describe('#loadProcess', function () {
        it('early returns if process already exists', function () {
            let sm = new ServiceManager();
            sm.process = new BaseProcess(sm);
            sm._loadProcess('test', class DummyProcess {});
        });

        it('returns if process name is not the one in config', function () {
            let config = {get: () => 'right'};
            let sm = new ServiceManager(config);
            sm._loadProcess('wrong', class DummyProcess {});
        });

        it ('throws error if process does not extend BaseProcess', function () {
            let config = {get: () => 'test'};
            let sm = new ServiceManager(config);

            try {
                sm._loadProcess('test', class DummyProcess {});
                expect(false, 'loadProcess should have thrown').to.be.true;
            } catch (error) {
                expect(error.message).to.match(/does not extend BaseProcess/);
            }
        });

        it('throws error if process does not implement all the required methods', function () {
            let config = {get: () => 'test'};
            let sm = new ServiceManager(config);

            let reset = ServiceManager.__set__('hasRequiredFns', () => ['test']);

            try {
                sm._loadProcess('test', class DummyProcess extends BaseProcess {});
                expect(false, 'loadProcess should have thrown').to.be.true;
            } catch (error) {
                expect(error.message).to.match(/missing the following required methods\: test/);
            }

            reset();
        });

        describe('when implementing required methods', function () {
            let reset;

            beforeEach(function () {
                reset = ServiceManager.__set__('hasRequiredFns', () => []);
            });

            afterEach(function () {
                reset();
            });

            it('defaults to local if Process.willRun returns false', function () {
                let config = {get: () => 'test', set: sinon.spy()};
                let ui = {log: sinon.spy()};
                let sm = new ServiceManager(config, ui);

                sm._loadProcess('test', class DummyProcess extends BaseProcess {
                    static willRun() { return false; }
                });

                expect(ui.log.calledOnce, 'ui.log was called').to.be.true;
                expect(ui.log.args[0][0]).to.match(/\'test\' process manager will not run/);
                expect(config.set.calledOnce, 'config.set was called').to.be.true;
                expect(config.set.args[0][1]).to.equal('local');
            });

            it('is loaded as a service', function () {
                let config = {get: () => 'test'};
                let sm = new ServiceManager(config);
                let _loadService = sandbox.stub(sm, '_loadService');
                let dummyProcess = class DummyProcess extends BaseProcess {};

                sm._loadProcess('test', dummyProcess);

                expect(_loadService.calledOnce, 'loadService was called').to.be.true;
                expect(_loadService.args[0][0]).to.equal('test');
                expect(_loadService.args[0][1]).to.deep.equal(dummyProcess);
            });
        });
    });

    describe('#registerHook', function () {
        let originalAllowedHooks;

        beforeEach(function () {
            originalAllowedHooks = ServiceManager.allowedHooks;
            ServiceManager.allowedHooks = [];
        });

        afterEach(function () {
            ServiceManager.allowedHooks = originalAllowedHooks;
        });

        it('throws error if hook does not exist', function () {
            ServiceManager.allowedHooks = ['valid'];
            let sm = new ServiceManager();

            try {
                sm.registerHook('invalid', () => {}, 'test');
                expect(false, 'registerHook should have thrown an error').to.be.true;
            } catch (error) {
                expect(error.message).to.match(/invalid does not exist/);
            }
        });

        it('throws error if service does not exist', function () {
            ServiceManager.allowedHooks = ['valid'];
            let sm = new ServiceManager();

            sm._loadService('test', class DummyService extends BaseService {
                init() {}
            });

            try {
                sm.registerHook('valid', () => {}, 'nonexistent');
                expect(false, 'registerHook should have thrown an error').to.be.true;
            } catch (error) {
                expect(error.message).to.match(/nonexistent does not exist/);
            }
        });

        it('creates hook object if it does not exist', function () {
            ServiceManager.allowedHooks = ['valid'];
            let sm = new ServiceManager();

            sm._loadService('test', class DummyService extends BaseService {
                init() {}
            });

            sm.registerHook('valid', () => {}, 'test');
            expect(sm.hooks.valid).to.be.ok;
        });
    });

    describe('#callHook', function () {
        let originalAllowedHooks;

        beforeEach(function () {
            originalAllowedHooks = ServiceManager.allowedHooks;
            ServiceManager.allowedHooks = [];
        });

        afterEach(function () {
            ServiceManager.allowedHooks = originalAllowedHooks;
        });

        it('throws error if hook does not exist', function () {
            ServiceManager.allowedHooks = ['valid'];
            let sm = new ServiceManager();

            try {
                sm.callHook('invalid');
                expect(false, 'registerHook should have thrown an error').to.be.true;
            } catch (error) {
                expect(error.message).to.match(/invalid does not exist/);
            }
        });

        it('returns a Promise', function () {
            ServiceManager.allowedHooks = ['test'];
            let sm = new ServiceManager();

            let result = sm.callHook('test');
            expect(result.then).to.be.a('function'); // basic check for is a promise

            return result;
        });

        it('calls hook functions with proper arguments and context', function () {
            ServiceManager.allowedHooks = ['test'];
            let sm = new ServiceManager();
            let hookCalled = sinon.spy();

            sm._loadService('test', class DummyService extends BaseService {
                init() {
                    this.checkValue = 'exists';
                }
            });

            sm.registerHook('test', function (testArg1, testArg2) {
                expect(testArg1).to.equal('foo');
                expect(testArg2).to.equal('bar');
                expect(this.checkValue).to.equal('exists');
                hookCalled();
            }, 'test');

            return sm.callHook('test', 'foo', 'bar').then(() => {
                expect(hookCalled.calledOnce).to.be.true;
            });
        });
    });

    describe('#hasRequiredFns', function () {
        let hasRequiredFns = ServiceManager.__get__('hasRequiredFns');
        let originalRequiredMethods;

        beforeEach(function () {
            originalRequiredMethods = BaseProcess.requiredMethods;
            BaseProcess.requiredMethods = [];
        });

        afterEach(function () {
            BaseProcess.requiredMethods = originalRequiredMethods;
        });

        it('adds method if method does not exist in class', function () {
            BaseProcess.requiredMethods = ['test'];

            let result = hasRequiredFns(class Test {}.prototype);

            expect(result).to.have.length(1);
            expect(result[0]).to.equal('test');
        });

        it('adds method to result if method exists in parent class but not in base class', function () {
            BaseProcess.requiredMethods = ['test'];
            let Parent = class Parent {
                test() {}
            };

            let result = hasRequiredFns(class Test extends Parent {}.prototype);

            expect(result).to.have.length(1);
            expect(result[0]).to.equal('test');
        });

        it('adds method to result if method is not a function', function () {
            BaseProcess.requiredMethods = ['test'];
            let test = class Test {};
            test.prototype.test = 'notafunction';

            let result = hasRequiredFns(test.prototype);

            expect(result).to.have.length(1);
            expect(result[0]).to.equal('test');
        });

        it ('doesn\'t add method if all the conditions are met', function () {
            BaseProcess.requiredMethods = ['test'];
            let Parent = class Parent {
                test() {}
            };
            let Test = class Test extends Parent {
                test() {}
            };

            let result = hasRequiredFns(Test.prototype);
            expect(result).to.have.length(0);
        });
    });
});
