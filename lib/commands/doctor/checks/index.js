'use strict';
const nodeVersion = require('./node-version');
const folderPermissions = require('./folder-permissions');
const systemStack = require('./system-stack');
const mysqlCheck = require('./mysql');
const validateConfig = require('./validate-config');

module.exports = [
    nodeVersion,
    folderPermissions,
    systemStack,
    mysqlCheck,
    validateConfig
];
