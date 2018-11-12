'use strict';
const chalk = require('chalk');
const semver = require('semver');

const errors = require('../../../errors');
const cliPackage = require('../../../../package');
const checkDirectoryAndAbove = require('./check-directory');

const taskTitle = 'Checking system Node.js version';

function nodeVersion(ctx) {
    if (process.env.GHOST_NODE_VERSION_CHECK !== 'false' && !semver.satisfies(process.versions.node, cliPackage.engines.node)) {
        return Promise.reject(new errors.SystemError({
            message: `${chalk.red('The version of Node.js you are using is not supported.')}
${chalk.gray('Supported: ')}${cliPackage.engines.node}
${chalk.gray('Installed: ')}${process.versions.node}
See ${chalk.underline.blue('https://docs.ghost.org/faq/node-versions/')} for more information`,
            task: taskTitle
        }));
    }

    if (ctx.local || !ctx.system.platform.linux || (ctx.argv && ctx.argv['setup-linux-user'] === false)) {
        return Promise.resolve();
    }

    return checkDirectoryAndAbove(process.argv[0], 'install node and Ghost-CLI', taskTitle);
}

module.exports = {
    title: taskTitle,
    task: nodeVersion,
    category: ['install', 'update']
};
