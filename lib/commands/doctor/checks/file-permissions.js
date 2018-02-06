'use strict';

const checkPermissions = require('./check-permissions');

const taskTitle = 'Checking file permissions';

module.exports = {
    title: taskTitle,
    enabled: (ctx) => ctx.instance && ctx.instance.process.name !== 'local',
    task: () => checkPermissions('files', taskTitle),
    category: ['start', 'update']
};
