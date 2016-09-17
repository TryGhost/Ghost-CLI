/* jshint bitwise:false */
var chalk = require('chalk'),
    eol = require('os').EOL;

module.exports = {
    nodeVersion: function nodeVersionCheck() {
        var cliPackage = require('../../../../package'),
            semver = require('semver');

        if (process.env.GHOST_NODE_VERSION_CHECK !== 'false' &&
            !semver.satisfies(process.versions.node, cliPackage.engines.node)) {
            return chalk.red('    The version of node you are using is not supported.') + eol +
                '    ' + chalk.gray('Supported: ') + cliPackage.engines.node + eol +
                '    ' + chalk.gray('Installed: ') + process.versions.node + eol +
                '    See ' + chalk.underline.blue('http://support.ghost.org/supported-node-versions/') +
                ' for more information' + eol;
        }

        return true;
    },

    folderPermissions: function folderPermissions() {
        var fs = require('fs'),
            constants = require('constants');

        try {
            fs.accessSync(process.cwd(), constants.R_OK | constants.W_OK);
            return true;
        } catch (e) {
            return chalk.red(
                '    The directory ' + process.cwd() + ' is not writable.' + eol +
                '    Please fix your directory permissions.' + eol
            );
        }
    }
};
