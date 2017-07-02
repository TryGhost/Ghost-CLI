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

    success() {
        // Base implementation - noop
    }

    error(error) {
        // Base implementation - re-throw the error in case the
        // extension has no error method defined
        throw error;
    }

    isRunning() {
        // Base Implementation
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

    let missing = requiredMethods.filter((method) => !SubClass.prototype.hasOwnProperty(method));

    if (!missing.length) {
        return true;
    }

    return missing;
}

module.exports = ProcessManager
module.exports.isValid = isValid;
