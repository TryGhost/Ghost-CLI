const Command = require('../command');

class CheckUpdateCommand extends Command {
    async run({v1}) {
        const semver = require('semver');
        const {loadVersions} = require('../utils/version');
        const instance = this.system.getInstance();

        if (instance.version) {
            const {latest, latestMajor} = await loadVersions();
            const versionToCheck = v1 ? latestMajor.v1 : latest;

            if (semver.gt(versionToCheck, instance.version)) {
                const diff = semver.diff(instance.version, versionToCheck);
                this.ui.log(`New ${diff} version available: ${versionToCheck}`);
            }
        }
    }
}

CheckUpdateCommand.description = 'Check if an update is available for a Ghost installation';
CheckUpdateCommand.allowRoot = true;
CheckUpdateCommand.options = {
    v1: {
        describe: 'Limit check to Ghost 1.x releases',
        type: 'boolean',
        default: false
    }
};

module.exports = CheckUpdateCommand;
