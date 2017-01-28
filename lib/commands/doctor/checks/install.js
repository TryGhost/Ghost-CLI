'use strict';
const fs = require('fs');
const eol = require('os').EOL;
const chalk = require('chalk');
const semver = require('semver');
const constants = require('constants');
const cliPackage = require('../../../../package');

module.exports = [{
    title: 'Checking system node version',
    task: () => {
        if (process.env.GHOST_NODE_VERSION_CHECK !== 'false' &&
            !semver.satisfies(process.versions.node, cliPackage.engines.node)) {
            throw new Error(
                `${chalk.red('The version of node you are using is not supported.')}${eol}` +
                `${chalk.gray('Supported: ')}${cliPackage.engines.node}${eol}` +
                `${chalk.gray('Installed: ')}${process.versions.node}${eol}` +
                `See ${chalk.underline.blue('https://support.ghost.org/supported-node-versions')} ` +
                'for more information'
            );
        }
    }
}, {
    title: 'Checking current folder permissions',
    task: () => {
        try {
            fs.accessSync(process.cwd(), constants.R_OK | constants.W_OK);
        } catch (e) {
            return Promise.reject(new Error(
                `The current directory is not writable.${eol}` +
                'Please fix your directory permissions.'
            ));
        }
    }
}];
