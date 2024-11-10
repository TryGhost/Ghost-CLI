'use strict';
const fs = require('node:fs/promises');
const constants = require('constants');
const chalk = require('chalk');

const errors = require('../../../errors');
const checkDirectoryAndAbove = require('./check-directory');

const taskTitle = 'Checking current folder permissions';

async function installFolderPermissions(ctx) {
    try {
        await fs.access(process.cwd(), constants.R_OK | constants.W_OK);
    } catch (_) {
        throw new errors.SystemError({
            message: `The directory ${process.cwd()} is not writable by your user. You must grant write access and try again.`,
            help: `${chalk.green('https://ghost.org/docs/install/ubuntu/#create-a-directory')}`,
            task: taskTitle
        });
    }

    if (ctx.local || !ctx.system.platform.linux || (ctx.argv && ctx.argv['setup-linux-user'] === false)) {
        return;
    }

    return checkDirectoryAndAbove(process.cwd(), 'run `ghost install`', taskTitle);
}

module.exports = {
    title: taskTitle,
    task: installFolderPermissions,
    category: ['install', 'update', 'start']
};
