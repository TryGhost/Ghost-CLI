'use strict';

const every = require('lodash/every');
const requiredMethods = [
    'start',
    'stop',
    'isRunning'
];
const enableMethods = [
    'isEnabled',
    'enable',
    'disable'
];

class ProcessManager {
    /**
     * Constructs the process manager. Process Managers get access to the UI and System instances
     *
     * @param {UI} ui UI instance
     * @param {System} system System
     * @param {Instance} instance Ghost instance
     */
    constructor(ui, system, instance) {
        this.ui = ui;
        this.system = system;
        this.instance = instance;
    }

    /**
     * Method called to start the Ghost process
     *
     * @param {String} cwd Current working directory of Ghost instance
     * @param {String} environment Environment to start Ghost in
     * @return Promise<void>|null
     */
    start() {
        // Base implementation - noop
        return Promise.resolve();
    }

    stop() {
        // Base implementation - noop
        return Promise.resolve();
    }

    restart(cwd, env) {
        return this.stop(cwd, env).then(() => this.start(cwd, env));
    }

    /* istanbul ignore next */
    success() {
        // Base implementation - noop
    }

    error(error) {
        // Base implementation - re-throw the error in case the
        // extension has no error method defined
        throw error;
    }

    isRunning() {
        // Base Implementation - noop
        return Promise.resolve(false);
    }

    /**
     * General implementation of figuring out if the Ghost blog has started successfully.
     *
     * @returns {Promise<any>}
     */
    ensureStarted(options) {
        const portPolling = require('./utils/port-polling');
        const semver = require('semver');

        options = Object.assign({
            stopOnError: true,
            port: this.instance.config.get('server.port'),
            host: this.instance.config.get('server.host', 'localhost'),
            useNetServer: semver.major(this.instance.version) === 2
        }, options || {});

        return portPolling(options).catch((err) => {
            if (options.stopOnError) {
                return this.stop().catch(() => Promise.reject(err)).then(() => Promise.reject(err));
            }

            return Promise.reject(err);
        });
    }

    /**
     * This function checks if this process manager can be used on this system
     *
     * @return {Boolean} whether or not the process manager can be used
     */
    static willRun() {
        // Base implementation - return true
        return true;
    }
}

function isValid(SubClass) {
    if (!(SubClass.prototype instanceof ProcessManager)) {
        return false;
    }

    const missing = requiredMethods.filter(method => !SubClass.prototype.hasOwnProperty(method));

    if (!missing.length) {
        return true;
    }

    return missing;
}

function supportsEnableBehavior(processInstance) {
    return every(enableMethods, method => processInstance[method]);
}

module.exports = ProcessManager;
module.exports.isValid = isValid;
module.exports.supportsEnableBehavior = supportsEnableBehavior;
