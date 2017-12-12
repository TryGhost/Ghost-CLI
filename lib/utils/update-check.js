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
        if (update.type === 'latest') {
            return Promise.resolve();
        }

        const chalk = require('chalk');
        const errors = require('../errors');

        ui.log(
            'You are running an outdated version of Ghost-CLI.\n' +
            'It is recommended that you upgrade before continuing.\n' +
            `Run ${chalk.cyan('`npm install -g ghost-cli@latest`')} to upgrade.\n`,
            'yellow'
        );

        return ui.prompt({
            type: 'confirm',
            message: 'Continue without upgrading?',
            default: false,
            name: 'yes'
        }).then((answers) => {
            if (!answers.yes) {
                return Promise.reject(new errors.SystemError('Ghost-CLI version is out-of-date'));
            }

            return Promise.resolve();
        });
    });
};
