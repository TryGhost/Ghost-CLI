'use strict';
const Config = require('../utils/config');
const checkValidInstall = require('../utils/check-valid-install');

module.exports.execute = function execute(command, args) {
    checkValidInstall('service');

    this.service.setConfig(Config.load(this.environment));

    return this.service.callCommand(command, args);
};
