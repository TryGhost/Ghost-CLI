'use strict';
const Command = require('../command');

class RestartCommand extends Command {
    async run() {
        const instance = this.system.getInstance();

        const isRunning = await instance.isRunning();
        if (!isRunning) {
            this.ui.log('Ghost instance is not running! Starting...', 'yellow');
            return this.ui.run(() => instance.start(), 'Starting Ghost');
        }

        instance.loadRunningEnvironment(true);
        await this.ui.run(() => instance.restart(), 'Restarting Ghost');
    }
}

RestartCommand.description = 'Restart the Ghost instance';
module.exports = RestartCommand;
