'use strict';

const checkPermissions = require('./check-permissions');

const taskTitle = 'Checking file permissions';

module.exports = {
    title: taskTitle,
    enabled: ({instance}) => instance && instance.process.name !== 'local',
    task: () => checkPermissions('files', taskTitle),
    category: ['start', 'update']
};
