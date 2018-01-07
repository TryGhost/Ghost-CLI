'use strict';
const Promise = require('bluebird');
const updateNotifier = require('update-notifier');
const pkg = require('../../package.json');

/**
 * Checks if a version update is available
 * @param {UI} ui ui instance
 */
module.exports = function updateCheck(ui) {
    return Promise.fromCallback(cb => updateNotifier({pkg: pkg, callback: cb})).then((update) => {
        if (update.type !== 'latest') {
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
