'use strict';

const path = require('path');

const checkPermissions = require('./check-permissions');
const ghostUser = require('../../../utils/use-ghost-user');

const taskTitle = 'Checking content folder ownership';

module.exports = {
    title: taskTitle,
    enabled: () => ghostUser.shouldUseGhostUser(path.join(process.cwd(), 'content')),
    task: () => checkPermissions('owner', taskTitle),
    category: ['start', 'update']
};
