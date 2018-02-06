'use strict';

const checkPermissions = require('./check-permissions');

const taskTitle = 'Checking folder permissions';

module.exports = {
    title: taskTitle,
    enabled: (ctx) => ctx.instance && ctx.instance.process.name !== 'local',
    task: () => checkPermissions('folder', taskTitle),
    category: ['start', 'update']
};
