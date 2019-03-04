'use strict';
const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const semver = require('semver');
const latestVersion = require('latest-version');
const pkg = require('../../package.json');

/**
 * Checks if a version update is available
 * @param {UI} ui ui instance
 * @param {System} system System instance
 */
module.exports = function preChecks(ui, system) {
    const configstore = path.join(os.homedir(), '.config');

    const tasks = [{
        title: 'Checking for Ghost-CLI updates',
        task: () => latestVersion(pkg.name).then((latest) => {
            if (semver.lt(pkg.version, latest)) {
                const chalk = require('chalk');

                ui.log(
                    'You are running an outdated version of Ghost-CLI.\n' +
                    'It is recommended that you upgrade before continuing.\n' +
                    `Run ${chalk.cyan('`npm install -g ghost-cli@latest`')} to upgrade.\n`,
                    'yellow'
                );
            }
        }),
        enabled: () => process.env.GHOST_CLI_PRE_CHECKS !== 'false'
    }, {
        title: 'Ensuring correct ~/.config folder ownership',
        task: () => fs.lstat(configstore).then((stats) => {
            if (stats.uid === process.getuid() && stats.gid === process.getgid()) {
                return;
            }

            const {USER} = process.env;

            return ui.sudo(`chown -R ${USER}:${USER} ${configstore}`);
        }),
        enabled: () => system.platform.linux && fs.existsSync(configstore) && process.env.GHOST_CLI_PRE_CHECKS !== 'false'
    }];

    return ui.listr(tasks, {}, {clearOnSuccess: true});
};
