'use strict';

/**
 * This index file is used by extensions to require some of the various base classes
 * of the CLI.
 *
 * The reason for the additional logic here is because in various places in the CLI,
 * there are checks to see if a class extends one of the CLI core classes. Because
 * there could be multiple Ghost-CLI installs (since extensions have to require ghost-cli
 * in order to function), we ensure here that only the main version of each of these classes
 * is exported.
 */

const path = require('path');
const rootPath = path.resolve(path.dirname(require.main.filename), '../lib/index.js');

if (!require.main.filename.endsWith('ghost') || rootPath === __filename) {
    module.exports = {
        Command: require('./command'),
        ProcessManager: require('./process-manager'),
        Extension: require('./extension'),
        errors: require('./errors'),
        ui: require('./ui')
    };
} else {
    module.exports = require(rootPath);
}
