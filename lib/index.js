'use strict';

/**
 * This index file is used by extensions to require some of the various base classes
 * of the CLI.
 */
module.exports = {
    Command: require('./command'),
    ProcessManager: require('./process-manager'),
    Extension: require('./extension'),
    errors: require('./errors'),
    ui: require('./ui')
};
