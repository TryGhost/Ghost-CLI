const Command = require('../command');

class BackupCommand extends Command {
    async run() {
        const semver = require('semver');

        const backupTask = require('../tasks/backup');
        const {loadVersions} = require('../utils/version');
        const {SystemError} = require('../errors');

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
        const {latestMajor, latest} = await loadVersions();
        const activeMajor = semver.major(instance.version);
        const latestMinor = latestMajor[`v${activeMajor}`];

        const isBehindByMajor = ['major', 'premajor'].includes(semver.diff(instance.version, latest));

        let backupFile;

        await this.ui.run(async () => {
            backupFile = await backupTask(this.ui, instance);
        }, 'Backing up site');

        if (latestMinor && instance.version !== latestMinor && isBehindByMajor) {
            this.ui.log(`We strongly recommend running \`ghost backup\` again after upgrading to v${latestMinor} & before upgrading to v${semver.parse(latest).major}.`, 'yellow');
        }

        this.ui.log(`Backup saved to ${backupFile}`, 'green');
    }
}

BackupCommand.description = 'Backup content & files';

module.exports = BackupCommand;
