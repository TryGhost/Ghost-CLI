/* jshint bitwise:false */
var BaseCommand = require('./base'),
    chalk = require('chalk'),
    eol = require('os').EOL;

module.exports = BaseCommand.extend({
    name: 'doctor',
    description: 'check the system for any potential hiccups when installing/updating Ghost',

    execute: function () {
        this.symbols = require('log-symbols');

        this.runCheck('nodeVersion', 'Node version is supported');
        this.runCheck('folderPermissions', 'User has correct folder permissions');
    },

    runCheck: function runCheck(check, title) {
        var result = this.checks[check]();

        if (result === true) {
            this.ui.success(this.symbols.success + ' ' + title);
            return;
        }

        this.ui.fail(this.symbols.error + ' ' + title);
        this.ui.log(eol + result);
    },

    checks: {
        nodeVersion: function nodeVersionCheck() {
            var cliPackage = require('../../package'),
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
    }
});
