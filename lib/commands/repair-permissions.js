'use strict';
const cli = require('../../../lib');

class RepairPermissionsCommand extends cli.Command {
    run() {

    }
};

RepairPermissionsCommand.description = 'Repair file/folder permissions of a Ghost instance';

module.exports = RepairPermissionsCommand;
