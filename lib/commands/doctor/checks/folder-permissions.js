'use strict';

const checkPermissions = require('./check-permissions');

const taskTitle = 'Checking folder permissions';

module.exports = {
    title: taskTitle,
    enabled: (ctx) => {
        const instance = ctx.system.getInstance();
        const isLocal = instance.process.name === 'local' ? true : false;

        return !isLocal;
    },
    task: () => checkPermissions('folder', taskTitle),
    category: ['start', 'update']
};
