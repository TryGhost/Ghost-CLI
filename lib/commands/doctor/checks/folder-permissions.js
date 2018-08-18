'use strict';

const checkPermissions = require('./check-permissions');

const taskTitle = 'Checking folder permissions';

module.exports = {
    title: taskTitle,
    enabled: ({instance}) => instance && instance.process.name !== 'local',
    task: () => checkPermissions('folder', taskTitle),
    category: ['start', 'update']
};
