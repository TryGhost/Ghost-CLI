'use strict';
const errors = require('../../../errors');
const chalk = require('chalk');
const ghostUser = require('../../../utils/use-ghost-user');

const taskTitle = 'Checking logged in user';

function loggedInUser() {
    const uid = process.getuid();
    const ghostStats = ghostUser.getGhostUid();

    if (ghostStats && ghostStats.uid === uid) {
        throw new errors.SystemError({
            message: 'You can\'t run install commands with a user called "ghost". Switch to a different user and try again.',
            help: `${chalk.green('https://docs.ghost.org/install/ubuntu/#create-a-new-user-')}`,
            task: taskTitle
        });
    }

    return;
}

module.exports = {
    title: taskTitle,
    task: loggedInUser,
    enabled: ctx => !ctx.local && !(ctx.instance && ctx.instance.process.name === 'local') && ctx.system.platform.linux && !(ctx.argv && ctx.argv.process === 'local'),
    category: ['install']
};
