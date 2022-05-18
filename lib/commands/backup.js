const Command = require('../command');

class BackupCommand extends Command {
    async run(argv) {
        const semver = require('semver');

        const backupTask = require('../tasks/backup');
        const {loadVersions} = require('../utils/version');
        const {CliError, SystemError} = require('../errors');

        const instance = this.system.getInstance();
        const isRunning = await instance.isRunning();

        if (!isRunning) {
            const shouldStart = await this.ui.confirm('Ghost instance is not currently running. Would you like to start it?', true);

            if (!shouldStart) {
                throw new SystemError('Ghost instance is not currently running');
            }

            instance.checkEnvironment();
            await this.ui.run(() => instance.start(), 'Starting Ghost');
        }

        // Get the latest version in our current major
        const {latestMajor} = await loadVersions();
        const activeMajor = semver.major(instance.version);
        const latestMinor = latestMajor[`v${activeMajor}`];

        if (instance.version !== latestMinor && !argv.force) {
            const currentMajor = semver.major(instance.version);

            throw new CliError({
                message: `We strongly recommend upgrading to the latest v${currentMajor} before backing up & upgrading across majors in order to ensure compatibility with future major versions of Ghost.`,
                help: `Run \`ghost update v${currentMajor}\` to get the latest version or alternatively run \`ghost backup --force\` to make an extra backup now.`
            });
        }

        let backupFile;

        await this.ui.run(async () => {
            backupFile = await backupTask(this.ui, instance);
        }, 'Backing up site');

        this.ui.log(`Backup saved to ${backupFile}`, 'green');
    }
}

BackupCommand.description = 'Backup content & files';
BackupCommand.options = {
    force: {
        description: 'Force backup if not on the latest version',
        type: 'boolean'
    }
};

module.exports = BackupCommand;
