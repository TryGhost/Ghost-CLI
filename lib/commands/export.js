const Command = require('../command');

class ExportCommand extends Command {
    async run(argv) {
        const {exportTask} = require('../tasks/import');
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

        await this.ui.run(() => exportTask(this.ui, instance, argv.file), 'Exporting content');
        this.ui.log(`Content exported to ${argv.file}`, 'green');
    }
}

ExportCommand.description = 'Export content from a blog';
ExportCommand.params = '[file]';

module.exports = ExportCommand;
