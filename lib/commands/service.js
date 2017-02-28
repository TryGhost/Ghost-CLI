'use strict';

module.exports.execute = function execute(command, args) {
    return this.service.callCommand(command, args);
};
