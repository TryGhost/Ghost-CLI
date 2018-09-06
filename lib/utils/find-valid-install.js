'use strict';

const {dirname} = require('path');
const debug = require('debug')('ghost-cli:find-instance');
const checkValidInstall = require('./check-valid-install');

const isRoot = () => dirname(process.cwd()) === process.cwd();

function findValidInstallation(name = '', recursive = false, exit = false) {
    debug(`Checking valid install: ${process.cwd()}`);
    try {
        checkValidInstall(name, exit);
        debug(`Found valid install!`);
    } catch (error) {
        /**
         * Only move up a directory if
         *  a) checkValidInstall failed because the `.ghost-cli` file wasn't found
         *  b) we're supposed to find an installation recursively
         *  c) we're not in the drive root (if we are, that's the furthest up we can go!)
         */
        if (error.message === 'NO_CONFIG' &&
        recursive &&
        !isRoot()
        ) {
            debug(`Going up...`);
            process.chdir('..');
            const shouldExit = isRoot();
            return findValidInstallation(name, recursive, shouldExit);
        }
        debug('no valid installation found', error.message);

        process.exit(1);
    }
}

module.exports = findValidInstallation;
