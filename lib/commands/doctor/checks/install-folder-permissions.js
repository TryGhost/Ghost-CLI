'use strict';
const fs = require('fs-extra');
const constants = require('constants');
const chalk = require('chalk');

const errors = require('../../../errors');
const checkDirectoryAndAbove = require('./check-directory');

const taskTitle = 'Checking current folder permissions';

function installFolderPermissions(ctx) {
    return fs.access(process.cwd(), constants.R_OK | constants.W_OK).catch(() => {
        return Promise.reject(new errors.SystemError({
            message: 'The current directory is not writable. Please fix the permissions of your install directory.',
            help: `${chalk.green('https://docs.ghost.org/docs/install#section-your-user-must-own-this-directory')}`,
            task: taskTitle
        }));
    }).then(() => {
        const isLocal = ctx.local || (ctx.instance && ctx.instance.process.name === 'local');

        if (isLocal || !ctx.system.platform.linux || (ctx.argv && ctx.argv['setup-linux-user'] === false)) {
            return Promise.resolve();
        }

        return checkDirectoryAndAbove(process.cwd(), 'run `ghost install`', taskTitle);
    });
}

module.exports = {
    title: taskTitle,
    task: installFolderPermissions,
    category: ['install', 'update', 'start']
};
