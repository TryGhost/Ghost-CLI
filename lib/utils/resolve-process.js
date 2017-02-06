'use strict';
const isFunction = require('lodash/isFunction');
const each = require('lodash/each');

const BaseProcess = require('../process');
const knownManagers = {
    local: '../process/local',
    systemd: '../process/systemd'
};

function hasRequiredFns(pm) {
    let requiredMethods = [
        'start',
        'stop'
    ];
    let unimplementedMethods = [];

    each(requiredMethods, function (method) {
        if (!pm[method] || !isFunction(pm[method])) {
            unimplementedMethods.push(method);
        }
    });

    return unimplementedMethods;
}

module.exports = function resolveProcessManager(config, ui) {
    let manager = config.get('process', 'systemd');
    let ProcessManager;

    if (knownManagers[manager]) {
        ProcessManager = require(knownManagers[manager]);
    } else {
        // TODO: implement way to pull other process managers by require
        ProcessManager = null;
    }

    if (!ProcessManager) {
        throw new Error(`Configured manager '${manager}' does not exist.`);
    }

    let pmInstance = new ProcessManager(config);

    if (!(pmInstance instanceof BaseProcess)) {
        throw new Error(`Configured manager '${manager}' does not extend BaseProcess.`);
    }

    let missingFns = hasRequiredFns(pmInstance);

    if (missingFns.length) {
        throw new Error(`Configured manager ${manager} is missing the following required methods: ${missingFns.join(', ')}`);
    }

    if (!pmInstance.checkUsability()) {
        ui.log(`The '${manager}' process manager does not work on this system, defaulting to 'local'`, 'yellow');
        // You may notice that we don't save the config here - this is in an effort to reduce duplicate error logs
        // TODO: this is probably not the best practice, should likely fix.
        config.set('process', 'local');
        let LocalProcess = require(knownManagers.local);

        return new LocalProcess(config);
    }

    return pmInstance;
};
