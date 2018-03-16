'use strict';
const path = require('path');
const errors = require('../../../errors');
const chalk = require('chalk');
const fs = require('fs');
const ghostUser = require('../../../utils/use-ghost-user');

const taskTitle = 'Checking if user is logged in with ghost user';

function loggedInGhostUser() {
    const uid = process.getuid();
    const contentDirStats = fs.lstatSync(path.join(process.cwd(), 'content'));

    const ghostStats = ghostUser.getGhostUid();

    // check if ghost user exists and if it's currently used
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
}

module.exports = {
    title: taskTitle,
    task: loggedInGhostUser,
    enabled: (ctx) => ctx.system.platform.linux,
    skip: (ctx) => ctx.instance && ctx.instance.process.name === 'local',
    category: ['start', 'update']
}
