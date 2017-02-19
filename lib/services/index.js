'use strict';
const each = require('lodash/each');
const toArray = require('lodash/toArray');
const includes = require('lodash/includes');
const isFunction = require('lodash/isFunction');
const Promise = require('bluebird');

const BaseService = require('./base');
const BaseProcess = require('./process/base');
const localService = require('./process/local');

function hasRequiredFns(pm) {
    let unimplementedMethods = [];

    each(BaseProcess.requiredMethods, function (method) {
        if (!pm[method] || !pm.hasOwnProperty(method) || !isFunction(pm[method])) {
            unimplementedMethods.push(method);
        }
    });

    return unimplementedMethods;
}

class ServiceManager {
    constructor(config, ui) {
        this.config = config;
        this.ui = ui;

        this.hooks = {};
        this.services = {};
        this.process = null;
    }

    registerHook(hook, fn, serviceName) {
        if (!includes(ServiceManager.allowedHooks, hook)) {
            throw new Error(`Hook ${hook} does not exist.`);
        }

        if (!this.services[serviceName]) {
            throw new Error(`Service ${serviceName} does not exist`);
        }

        if (!this.hooks[hook]) {
            this.hooks[hook] = {};
        }

        this.hooks[hook][serviceName] = fn;
    }

    callHook(hook) {
        if (!includes(ServiceManager.allowedHooks, hook)) {
            throw new Error(`Hook ${hook} does not exist.`);
        }

        let args = toArray(arguments).slice(1);
        let hooks = this.hooks[hook] || {};

        return Promise.each(Object.keys(hooks), (serviceName) => {
            let fn = hooks[serviceName];
            return fn.apply(this.services[serviceName], args);
        });
    }

    _loadProcess(name, Process) {
        if (this.process || name !== this.config.get('process')) {
            // Process manager has already been loaded, or the name does not
            // match the configured process manager
            return;
        }

        if (!(Process.prototype instanceof BaseProcess)) {
            throw new Error(`Configured process manager ${name} does not extend BaseProcess!`);
        }

        let missingFns = hasRequiredFns(Process.prototype);

        if (missingFns.length) {
            throw new Error(`Configured manager ${name} is missing the following required methods: ${missingFns.join(', ')}`);
        }

        if (!Process.willRun()) {
            this.ui.log(`The '${name}' process manager will not run on this system, defaulting to 'local'`, 'yellow');
            this.config.set('process', 'local');
            return this._loadProcess('local', localService.class);
        }

        this.process = this._loadService(name, Process);
    }

    _loadService(name, ServiceClass) {
        if (this.services[name]) {
            throw new Error('Service already exists!');
        }

        let service = new ServiceClass(this);
        this.services[name] = service;

        // Inject name into the service instance so it's accessible by the methods
        service.name = name;
        service.init();

        return service;
    }

    static load(config, ui) {
        let sm = new ServiceManager(config, ui);

        each(ServiceManager.knownServices, (service) => {
            let ServiceClass = service.class;

            if (!(ServiceClass.prototype instanceof BaseService)) {
                throw new Error('Service does not inherit from BaseService');
            }

            let name = service.name;

            if (service.type === 'process') {
                sm._loadProcess(name, ServiceClass);
                return;
            }

            sm._loadService(name, ServiceClass);
        });

        return sm;
    }
};

ServiceManager.allowedHooks = ['setup', 'start', 'stop', 'run'];
ServiceManager.knownServices = [
    // TODO: we only know about the nginx & built in process manager services
    // for now, in the future make this load globally installed services
    require('./process/systemd'),
    localService
];

module.exports = ServiceManager;
