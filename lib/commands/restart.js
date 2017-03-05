'use strict';
const Config = require('../utils/config');
const checkValidInstall = require('../utils/check-valid-install');
const start = require('./start');
const stop = require('./stop');

module.exports.execute = function execute() {
    checkValidInstall('restart');

    let config = Config.load('.ghost-cli');

    if (!config.has('running')) {
        return Promise.reject(new Error('Ghost instance is not currently running.'));
    }

    this.environment = config.get('running');

    return stop.execute.apply(this).then(() => {
        return start.execute.apply(this);
    });
};
