'use strict';
const os = require('os');
const execa = require('execa');
const path = require('path');
const errors = require('../../../errors');
const chalk = require('chalk');
const fs = require('fs');

const taskTitle = 'Checking logged in user and directory owner';

function checkGhostUser() {
    let ghostuid;
    let ghostgid;

    try {
        ghostuid = execa.shellSync('id -u ghost').stdout;
        ghostgid = execa.shellSync('id -g ghost').stdout;
    } catch (e) {
        // CASE: the ghost user doesn't exist, hence can't be used
        return false
    }

    ghostuid = parseInt(ghostuid);
    ghostgid = parseInt(ghostgid);

    return {
        uid: ghostuid,
        gid: ghostgid
    };
}

function loggedInUserOwner(ctx) {
    const uid = process.getuid();
    const gid = process.getgroups();
    const ghostStats = checkGhostUser();
    const dirStats = fs.lstatSync(path.join(process.cwd()));
    const contentDirStats = fs.lstatSync(path.join(process.cwd(), 'content'));

    // CASE 1: check if ghost user exists and if it's currently used
    if (ghostStats && ghostStats.uid && ghostStats.uid === uid) {
        // The ghost user might have been set up on the system and also used,
        // but only when it owns the content folder, it's an indication that it's also used
        // as the linux user and shall not be used as current user.
        if (contentDirStats.uid === ghostStats.uid) {
            return Promise.reject(new errors.SystemError({
                message: 'You can\'t use Ghost with the ghost user. Please log in with your own user.',
                help: `${chalk.green('https://docs.ghost.org/docs/install#section-create-a-new-user')}`,
                task: taskTitle
            }));
        }
    }

    // CASE 2: check if the current user is the owner of the current dir
    if (dirStats.uid !== uid) {
        if (gid.indexOf(dirStats.gid) < 0) {
            return Promise.reject(new errors.SystemError({
                message: `Your current user is not the owner of the Ghost directory and also not part of the same group.
Please log in with the user that owns the directory or add your user to the same group.`,
                help: `${chalk.green('https://docs.ghost.org/docs/install#section-create-a-new-user')}`,
                task: taskTitle
            }));
        }
        // Yup current user is not the owner, but in the same group, so just show a warning
        ctx.ui.log('The current user is not the owner of the Ghost directory. This might cause problems.');
    }

    return Promise.resolve();
}

module.exports = {
    title: taskTitle,
    task: loggedInUserOwner,
    enabled: (ctx) => ctx.instance && ctx.instance.process.name !== 'local',
    skip: () => os.platform() !== 'linux',
    category: ['start', 'update']
}
