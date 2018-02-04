'use strict';

const path = require('path');

const checkPermissions = require('./check-permissions');
const shouldUseGhostUser = require('../../../utils/use-ghost-user');

module.exports = {
    title: 'Checking content folder ownership',
    enabled: () => shouldUseGhostUser(path.join(process.cwd(), 'content')),
    task: () => checkPermissions('owner'),
    category: ['start', 'update']
};
