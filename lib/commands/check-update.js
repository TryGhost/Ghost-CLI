const Command = require('../command');

class CheckUpdateCommand extends Command {
    run({v1}) {
        const semver = require('semver');
        const resolveVersion = require('../utils/resolve-version');
        const {CliError} = require('../errors');

        const instance = this.system.getInstance();

        if (instance.version) {
            return resolveVersion(null, instance.version, v1).then((version) => {
                const diff = semver.diff(instance.version, version);
                this.ui.log(`New ${diff} version available: ${version}`);
            }).catch((error) => {
                if (!(error instanceof CliError) || !error.message.match(/No valid versions/)) {
                    return Promise.reject(error);
                }
            });
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
