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
};

module.exports = BaseProcess;
