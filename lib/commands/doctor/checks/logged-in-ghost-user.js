'use strict';
const path = require('path');
const errors = require('../../../errors');
const chalk = require('chalk');
const fs = require('fs');
const ghostUser = require('../../../utils/use-ghost-user');

const taskTitle = 'Ensuring user is not logged in as ghost user';

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
                message: 'You can\'t run commands with the "ghost" user. Switch to your own user and try again.',
                help: `${chalk.green('https://docs.ghost.org/install/ubuntu/#create-a-new-user-')}`,
                task: taskTitle
            });
        }
    }
}

module.exports = {
    title: taskTitle,
    task: loggedInGhostUser,
    enabled: ({system}) => system.platform.linux,
    skip: ({instance}) => instance && instance.process.name === 'local',
    category: ['start', 'update']
};
