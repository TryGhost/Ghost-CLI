'use strict';
const Promise = require('bluebird');
const includes = require('lodash/includes');
const updateNotifier = require('update-notifier');
const pkg = require('../../package.json');

/*
 * Update notifier sends several different types of updates,
 * we want to make sure the only ones that trigger a warning are
 * major, minor, and patch releases. This allows us to push prereleases
 * & such in the future without those triggering a warning for users
 *
 * see https://github.com/yeoman/update-notifier#comprehensive for the different types
 * of updates
 */
const typesToWarn = [
    'major',
    'minor',
    'patch'
];

/**
 * Checks if a version update is available
 * @param {UI} ui ui instance
 */
module.exports = function updateCheck(ui) {
    return Promise.fromCallback(cb => updateNotifier({pkg: pkg, callback: cb})).then((update) => {
        if (includes(typesToWarn, update.type)) {
            const chalk = require('chalk');

            ui.log(
                'You are running an outdated version of Ghost-CLI.\n' +
                'It is recommended that you upgrade before continuing.\n' +
                `Run ${chalk.cyan('`npm install -g ghost-cli@latest`')} to upgrade.\n`,
                'yellow'
            );
        }

        return Promise.resolve();
    });
};
