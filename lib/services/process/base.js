'use strict';
const BaseService = require('../base');

class BaseProcess extends BaseService {
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
};

BaseProcess.requiredMethods = [
    'start',
    'stop'
];

module.exports = BaseProcess;
