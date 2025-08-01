'use strict';
const nodeVersion = require('./node-version');
const loggedInUser = require('./logged-in-user');
const loggedInGhostUser = require('./logged-in-ghost-user');
const loggedInUserOwner = require('./logged-in-user-owner');
const installFolderPermissions = require('./install-folder-permissions');
const systemStack = require('./system-stack');
const mysqlCheck = require('./mysql');
const validateConfig = require('./validate-config');
const folderPermissions = require('./folder-permissions');
const filePermissions = require('./file-permissions');
const contentFolder = require('./content-folder');
const checkMemory = require('./check-memory');
const binaryDeps = require('./binary-deps');
const freeSpace = require('./free-space');
const pythonSetuptools = require('./python-setuptools');

module.exports = [
    nodeVersion,
    loggedInUser,
    loggedInGhostUser,
    loggedInUserOwner,
    installFolderPermissions,
    systemStack,
    mysqlCheck,
    validateConfig,
    folderPermissions,
    filePermissions,
    contentFolder,
    checkMemory,
    binaryDeps,
    freeSpace,
    pythonSetuptools
];
