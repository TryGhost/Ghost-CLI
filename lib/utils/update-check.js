'use strict';
const latestVersion = require('latest-version');
const semver = require('semver');
const pkg = require('../../package.json');

/**
 * Checks if a version update is available
 * @param {UI} ui ui instance
 */
module.exports = function updateCheck(ui) {
    return ui.run(
        () => latestVersion(pkg.name),
        'Checking for Ghost-CLI updates',
        {clear: true}
    ).then((latest) => {
        if (semver.lt(pkg.version, latest)) {
            const chalk = require('chalk');

            ui.log(
                'You are running an outdated version of Ghost-CLI.\n' +
                'It is recommended that you upgrade before continuing.\n' +
                `Run ${chalk.cyan('`npm install -g ghost-cli@latest`')} to upgrade.\n`,
                'yellow'
            );
        }
    });
};
