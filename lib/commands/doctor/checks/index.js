'use strict';
const nodeVersion = require('./node-version');
const folderPermissions = require('./folder-permissions');
const systemStack = require('./system-stack');
const mysqlCheck = require('./mysql');
const validateConfig = require('./validate-config');
const contentFolderPermissions = require('./content-folder');

module.exports = [
    nodeVersion,
    folderPermissions,
    systemStack,
    mysqlCheck,
    validateConfig,
    contentFolderPermissions
];
