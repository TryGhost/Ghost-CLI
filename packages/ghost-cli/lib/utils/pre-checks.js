const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const semver = require('semver');
const latestVersion = require('latest-version');
const pkg = require('../../package.json');
const getProxyAgent = require('./get-proxy-agent');

const configstore = path.join(os.homedir(), '.config');

async function updateCheck({ui}) {
    const latest = await latestVersion(pkg.name, {
        agent: getProxyAgent()
    });

    if (semver.lt(pkg.version, latest)) {
        const chalk = require('chalk');

        ui.log(
            'You are running an outdated version of Ghost-CLI.\n' +
            'It is recommended that you upgrade before continuing.\n' +
            `Run ${chalk.cyan('`npm install -g ghost-cli@latest`')} to upgrade.\n`,
            'yellow'
        );
    }
}

async function checkConfigPerms({ui}) {
    const stats = await fs.lstat(configstore);

    if (stats.uid === process.getuid() && stats.gid === process.getgid()) {
        return;
    }

    const {USER} = process.env;
    await ui.sudo(`chown -R ${USER}:${USER} ${configstore}`);
}

/**
 * Checks if a version update is available
 * @param {UI} ui ui instance
 * @param {System} system System instance
 */
module.exports = function preChecks(ui, system) {
    if (process.env.GHOST_CLI_PRE_CHECKS === 'false') {
        return;
    }

    const tasks = [{
        title: 'Checking for Ghost-CLI updates',
        task: updateCheck
    }, {
        title: 'Ensuring correct ~/.config folder ownership',
        task: checkConfigPerms,
        enabled: () => system.platform.linux && fs.existsSync(configstore)
    }];

    return ui.listr(tasks, {ui}, {clearOnSuccess: true});
};

// exports for unit testing
module.exports.updateCheck = updateCheck;
module.exports.checkConfigPerms = checkConfigPerms;
