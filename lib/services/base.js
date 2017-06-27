'use strict';

class BaseService {
    constructor(serviceManager) {
        this.serviceManager = serviceManager;
    }

    init() {
        // default implementation - noop
    }

    on(hook, fn) {
        if (typeof fn !== 'function') {
            fn = this[fn];
        }

        this.serviceManager.registerHook(hook, fn, this.name);
    }

    command(name, fn) {
        if (typeof fn !== 'function') {
            fn = this[fn];
        }

        this.serviceManager.registerCommand(name, fn, this.name);
    }

    get config() {
        return this.serviceManager.config;
    }

    get ui() {
        return this.serviceManager.ui;
    }

    get system() {
        return this.serviceManager.system;
    }
};

module.exports = BaseService;
