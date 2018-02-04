'use strict';

const checkPermissions = require('./check-permissions');

const taskTitle = 'Checking file permissions';

module.exports = {
    title: taskTitle,
    enabled: (ctx) => {
        const instance = ctx.system.getInstance();
        const isLocal = instance.process.name === 'local' ? true : false;

        return !isLocal;
    },
    task: () => checkPermissions('files', taskTitle),
    category: ['start', 'update']
};
