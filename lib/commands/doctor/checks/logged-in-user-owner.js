'use strict';
const path = require('path');
const errors = require('../../../errors');
const chalk = require('chalk');
const fs = require('fs');

const taskTitle = 'Checking if logged in user is directory owner';

function loggedInUserOwner(ctx) {
    // TODO: switch to require('os').userInfo() and output username in errors
    const uid = process.getuid();
    const gid = process.getgroups();
    const dir = process.cwd();
    const dirStats = fs.lstatSync(path.join(dir));

    // check if the current user is the owner of the current dir
    if (dirStats.uid !== uid) {
        if (gid.indexOf(dirStats.gid) < 0) {
            throw new errors.SystemError({
                message: `Your user does not own the directory ${dir} and is also not a member of the owning group.
You must either log in with the user that owns the directory or add your user to the owning group.`,
                help: `${chalk.green('https://docs.ghost.org/install/ubuntu/#create-a-new-user-')}`,
                task: taskTitle
            });
        }
        // Yup current user is not the owner, but in the same group, so just show a warning
        ctx.ui.log(`Your user does not own the directory ${dir}. This might cause permission issues.`, 'yellow');
    }
}

module.exports = {
    title: taskTitle,
    task: loggedInUserOwner,
    enabled: ({system}) => system.platform.linux,
    skip: ({instance}) => instance && instance.process.name === 'local',
    category: ['start', 'update']
};
