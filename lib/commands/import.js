const Command = require('../command');

class ImportCommand extends Command {
    async run(argv) {
        const semver = require('semver');
        const {importTask, parseExport} = require('../tasks/import');
        const {SystemError} = require('../errors');

        const instance = this.system.getInstance();
        const {version} = parseExport(argv.file);

        if (semver.major(version) === 0 && semver.major(instance.version) > 1) {
            throw new SystemError(`v0.x export files can only be imported by Ghost v1.x versions. You are running Ghost v${instance.version}.`);
        }

        const isRunning = await instance.isRunning();

        if (!isRunning) {
            const shouldStart = await this.ui.confirm('Ghost instance is not currently running. Would you like to start it?', true);

            if (!shouldStart) {
                throw new SystemError('Ghost instance is not currently running');
            }

            instance.checkEnvironment();
            await this.ui.run(() => instance.start(), 'Starting Ghost');
        }

        const importTasks = await importTask(this.ui, instance, argv.file);
        await importTasks.run();
    }
}

ImportCommand.description = 'Import a Ghost export';
ImportCommand.params = '[file]';

module.exports = ImportCommand;
