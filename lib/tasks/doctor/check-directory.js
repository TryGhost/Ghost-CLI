'use strict';
const fs = require('fs-extra');
const Mode = require('stat-mode');
const path = require('path');
const isRoot = require('path-is-root');

const {SystemError} = require('../../errors');

module.exports = async function checkDirectoryAndAbove(dir, extra, task) {
    if (isRoot(dir)) {
        return;
    }

    const stats = await fs.lstat(dir);
    const mode = new Mode(stats);

    if (!mode.others.read) {
        throw new SystemError({
            message: `The directory ${dir} is not readable by other users on the system.
This can cause issues with the CLI, you must either make this directory readable by others or ${extra} in another location.`,
            task
        });
    }

    await checkDirectoryAndAbove(path.join(dir, '../'), extra, task);
};
