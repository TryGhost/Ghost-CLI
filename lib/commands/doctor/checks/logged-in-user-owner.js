'use strict';
const path = require('path');
const errors = require('../../../errors');
const chalk = require('chalk');
const fs = require('fs');
const ghostUser = require('../../../utils/use-ghost-user');

const taskTitle = 'Checking logged in user and directory owner';

function loggedInUserOwner(ctx) {
    const uid = process.getuid();
    const gid = process.getgroups();
    const dirStats = fs.lstatSync(path.join(process.cwd()));
    const contentDirStats = fs.lstatSync(path.join(process.cwd(), 'content'));

    const ghostStats = ghostUser.getGhostUid();

    // CASE 1: check if ghost user exists and if it's currently used
    if (ghostStats && ghostStats.uid && ghostStats.uid === uid) {
        // The ghost user might have been set up on the system and also used,
        // but only when it owns the content folder, it's an indication that it's also used
        // as the linux user and shall not be used as current user.
        if (contentDirStats.uid === ghostStats.uid) {
            throw new errors.SystemError({
                message: 'You can\'t use Ghost with the ghost user. Please log in with your own user.',
                help: `${chalk.green('https://docs.ghost.org/docs/install#section-create-a-new-user')}`,
                task: taskTitle
            });
        }
    }

    // CASE 2: check if the current user is the owner of the current dir
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
