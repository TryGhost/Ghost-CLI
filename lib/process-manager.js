'use strict';
const requiredMethods = [
    'start',
    'stop'
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

    start() {
        // Base implementation - noop
    }

    stop() {
        // Base implementation - noop
    }

    success() {
        // Base implementation - noop
    }

    error(error) {
        // Base implementation - re-throw the error in case the
        // extension has no error method defined
        throw error;
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
    if (!SubClass.prototype instanceof ProcessManager) {
        return false;
    }

    let missing = requiredMethods.filter((method) => !SubClass.prototype[method]);

    if (!missing.length) {
        return true;
    }

    return missing;
}

module.exports = ProcessManager
// Rather than make it a static method,
// we export it here so subclasses can't override it
module.exports.isValid = isValid;
