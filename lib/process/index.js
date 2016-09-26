var CoreObject = require('core-object'),
    each = require('lodash/forEach'),
    knownManagers = {
        local: '../process/local'
    },
    BaseProcess;

function hasRequiredFns(pm) {
    var isFunction = require('lodash/isFunction'),
        requiredMethods = [
            'start',
            'stop'
        ],
        unimplementedMethods = [];

    each(requiredMethods, function (method) {
        if (!pm[method] || !isFunction(pm[method])) {
            unimplementedMethods.push(method);
        }
    });

    return unimplementedMethods;
}

/**
 * Base Process Manager class
 *
 * TODO: currently this doesn't do much, but is in place
 * if it needs to be extended later.
 */
module.exports = BaseProcess = CoreObject.extend({
    name: 'base',

    init: function init(config) {
        this._super();
        this.config = config;
    }
});

module.exports.resolve = function resolveProcessManager(config) {
    var manager = config.get('process', 'local'),
        ProcessManager, pmInstance, missingFns;

    // First check if the manager is in a location that is known
    if (knownManagers[manager]) {
        ProcessManager = require(knownManagers[manager]);
    } else {
        // TODO: implement way to pull other process managers by require
        ProcessManager = null;
    }

    if (!ProcessManager) {
        throw new Error('Configured manger does not exist.');
    }

    pmInstance = new ProcessManager(config);

    if (!(pmInstance instanceof BaseProcess)) {
        throw new Error('Configured manager does not extend BaseProcess.');
    }

    missingFns = hasRequiredFns(pmInstance);

    if (missingFns.length) {
        throw new Error(
            'Configured manager is missing the following required methods: ' +
            missingFns.join(', ')
        );
    }

    return pmInstance;
};
