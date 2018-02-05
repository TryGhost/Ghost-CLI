'use strict';
const nodeVersion = require('./node-version');
const installFolderPermissions = require('./install-folder-permissions');
const systemStack = require('./system-stack');
const mysqlCheck = require('./mysql');
const validateConfig = require('./validate-config');
const folderPermissions = require('./folder-permissions');
const filePermissions = require('./file-permissions');
const contentFolder = require('./content-folder');
const checkMemory = require('./check-memory');

module.exports = [
    nodeVersion,
    installFolderPermissions,
    systemStack,
    mysqlCheck,
    validateConfig,
    folderPermissions,
    filePermissions,
    contentFolder,
    checkMemory
];
