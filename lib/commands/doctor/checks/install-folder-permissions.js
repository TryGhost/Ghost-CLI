'use strict';
const fs = require('fs-extra');
const constants = require('constants');

const errors = require('../../../errors');
const checkDirectoryAndAbove = require('./check-directory');

function installFolderPermissions(ctx) {
    return fs.access(process.cwd(), constants.R_OK | constants.W_OK).catch(() => {
        return Promise.reject(new errors.SystemError(`The current directory is not writable.
Please fix your directory permissions.`));
    }).then(() => {
        if (ctx.local || !ctx.system.platform.linux || (ctx.argv && ctx.argv['setup-linux-user'] === false)) {
            return Promise.resolve();
        }

        return checkDirectoryAndAbove(process.cwd(), 'run `ghost install`');
    });
}

module.exports = {
    title: 'Checking current folder permissions',
    task: installFolderPermissions,
    category: ['install', 'update']
};
