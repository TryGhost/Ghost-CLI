'use strict';
const inquirer = require('inquirer');
const updateNotifier = require('update-notifier');
const pkg = require('../../package.json');

module.exports = function updateCheck() {
    return new Promise((resolve, reject) => {
        updateNotifier({
            pkg: pkg,
            callback: (err, update) => {
                if (err) {
                    return reject(err);
                }

                if (update.type === 'latest') {
                    // we are on the latest version, continue
                    return resolve();
                }

                const chalk = require('chalk');

                console.log(chalk.yellow(
                    'You are running an outdated version of Ghost-CLI.\n' +
                    'It is recommended that you upgrade before continuing.\n' +
                    `Run ${chalk.cyan('`npm install -g ghost-cli@latest`')} to upgrade.\n`
                ));

                inquirer.prompt({
                    type: 'confirm',
                    message: 'Continue without upgrading?',
                    default: false,
                    name: 'yes'
                }).then((answers) => {
                    if (answers.yes) {
                        return resolve();
                    }

                    reject();
                }).catch(reject);
            }
        });
    });
};
