'use strict';
const path = require('path');
const errors = require('../../../errors');
const chalk = require('chalk');
const fs = require('fs');

const taskTitle = 'Checking if logged in user is directory owner';

function loggedInUserOwner(ctx) {
    const uid = process.getuid();
    const gid = process.getgroups();
    const dirStats = fs.lstatSync(path.join(process.cwd()));

    // check if the current user is the owner of the current dir
    if (dirStats.uid !== uid) {
        if (gid.indexOf(dirStats.gid) < 0) {
            throw new errors.SystemError({
                message: `Your current user is not the owner of the Ghost directory and also not part of the same group.
Please log in with the user that owns the directory or add your user to the same group.`,
                help: `${chalk.green('https://docs.ghost.org/docs/install#section-create-a-new-user')}`,
                task: taskTitle
            });
        }
        // Yup current user is not the owner, but in the same group, so just show a warning
        ctx.ui.log(`${chalk.yellow('The current user is not the owner of the Ghost directory. This might cause problems.')}`);
    }
}

module.exports = {
    title: taskTitle,
    task: loggedInUserOwner,
    enabled: (ctx) => ctx.system.platform.linux,
    category: ['start', 'update']
}
