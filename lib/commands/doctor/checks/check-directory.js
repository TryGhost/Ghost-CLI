'use strict';
const fs = require('fs-extra');
const Mode = require('stat-mode');
const path = require('path');
const isRoot = require('path-is-root');

const errors = require('../../../errors');

module.exports = function checkDirectoryAndAbove(dir, extra) {
    if (isRoot(dir)) {
        return Promise.resolve();
    }

    return fs.lstat(dir).then((stats) => {
        const mode = new Mode(stats);

        if (!mode.others.read) {
            return Promise.reject(new errors.SystemError(`The path ${dir} is not readable by other users on the system.
This can cause issues with the CLI, please either make this directory readable by others or ${extra} in another location.`));
        }

        return checkDirectoryAndAbove(path.join(dir, '../'), extra);
    });
}
