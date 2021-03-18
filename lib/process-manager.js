'use strict';

const requiredMethods = [
    'start',
    'stop',
    'isRunning'
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
    async start() {}
    async stop() {}

    async restart(cwd, env) {
        await this.stop(cwd, env);
        await this.start(cwd, env);
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

    async isRunning() {
        return false;
    }

    /**
     * General implementation of figuring out if the Ghost blog has started successfully.
     *
     * @returns {Promise<any>}
     */
    async ensureStarted(options) {
        const portPolling = require('./utils/port-polling');
        const semver = require('semver');

        options = Object.assign({
            stopOnError: true,
            port: this.instance.config.get('server.port'),
            host: this.instance.config.get('server.host', 'localhost'),
            useNetServer: semver.major(this.instance.version) >= 2,
            useV4Boot: semver.major(this.instance.version) >= 4
        }, options || {});

        try {
            await portPolling(this.ui, options);
        } catch (error) {
            if (options.stopOnError) {
                try {
                    await this.stop();
                } catch (e) {
                    // ignore stop error
                }
            }

            throw error;
        }
    }

    // No-op base methods for enable/disable handling
    async isEnabled() {
        return false;
    }

    async enable() {}
    async disable() {}

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

    const missing = requiredMethods.filter(method => !Object.prototype.hasOwnProperty.call(SubClass.prototype, method));

    if (!missing.length) {
        return true;
    }

    return missing;
}

module.exports = ProcessManager;
module.exports.isValid = isValid;
