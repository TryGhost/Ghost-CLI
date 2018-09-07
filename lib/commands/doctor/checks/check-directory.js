'use strict';
const fs = require('fs-extra');
const Mode = require('stat-mode');
const path = require('path');
const isRoot = require('path-is-root');

const errors = require('../../../errors');

module.exports = function checkDirectoryAndAbove(dir, extra, task) {
    if (isRoot(dir)) {
        return Promise.resolve();
    }

    return fs.lstat(dir).then((stats) => {
        const mode = new Mode(stats);

        if (!mode.others.read) {
            return Promise.reject(new errors.SystemError({
                message: `The directory ${dir} is not readable by other users on the system.
This can cause issues with the CLI, you must either make this directory readable by others or ${extra} in another location.`,
                task: task
            }));
        }

        return checkDirectoryAndAbove(path.join(dir, '../'), extra);
    });
};
