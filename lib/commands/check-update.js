const Command = require('../command');

class CheckUpdateCommand extends Command {
    async run() {
        const chalk = require('chalk');
        const startCase = require('lodash/startCase');
        const semver = require('semver');
        const {loadVersions} = require('../utils/version');
        const instance = this.system.getInstance();

        if (instance.version) {
            const {latest, latestMajor} = await loadVersions();
            const currentMajor = semver.parse(instance.version).major;
            const latestMinor = latestMajor[`v${currentMajor}`];

            this.ui.log(`Current version: ${chalk.cyan(instance.version)}`);

            if (latestMinor && semver.neq(latestMinor, instance.version) && semver.neq(latestMinor, latest)) {
                this.ui.log(`Latest ${currentMajor}.x version: ${chalk.cyan(latestMinor)}`);
            }

            this.ui.log(`Latest version: ${chalk.cyan(latest)}`);

            if (semver.gt(latest, instance.version)) {
                const diff = semver.diff(instance.version, latest);

                this.ui.log(`${startCase(diff)} update available!`, 'green');
            } else {
                this.ui.log(`You're up to date!`, 'green');
            }
        }
    }
}

CheckUpdateCommand.description = 'Check if an update is available for a Ghost installation';
CheckUpdateCommand.allowRoot = true;

module.exports = CheckUpdateCommand;
