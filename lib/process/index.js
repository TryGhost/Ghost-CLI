'use strict';

class BaseProcess {
    constructor(config) {
        this.config = config;
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

    setup() {
        // Base implementation - noop
    }

    /**
     * This function checks if this process manager can be used on this system
     *
     * @return {Boolean} whether or not the process manager can be used
     */
    checkUsability() {
        // Base implementation - return true
        return true;
    }
};

module.exports = BaseProcess;
