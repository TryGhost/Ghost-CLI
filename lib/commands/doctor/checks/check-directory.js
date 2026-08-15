'use strict';
const fs = require('node:fs/promises');
const path = require('path');

const errors = require('../../../errors');

const OTHERS_READ = 0o004;

module.exports = function checkDirectoryAndAbove(dir, extra, task) {
    const parent = path.join(dir, '../');

    // path.join stops changing the path once it hits the root
    if (parent === dir || parent === './') {
        return Promise.resolve();
    }

    return fs.lstat(dir).then((stats) => {
        if (!(stats.mode & OTHERS_READ)) {
            return Promise.reject(new errors.SystemError({
                message: `The directory ${dir} is not readable by other users on the system.
This can cause issues with the CLI, you must either make this directory readable by others or ${extra} in another location.`,
                task: task
            }));
        }

        return checkDirectoryAndAbove(parent, extra);
    });
};
