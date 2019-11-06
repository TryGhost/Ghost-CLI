'use strict';
const Command = require('../command');

class RestartCommand extends Command {
    async run() {
        const instance = this.system.getInstance();
        const isRunning = await instance.isRunning();
        if (!isRunning) {
            const StartCommand = require('./start');
            this.ui.log('Ghost instance is not running! Starting...', 'yellow');
            return this.runCommand(StartCommand);
        }

        instance.loadRunningEnvironment(true);
        return this.ui.run(instance.process.restart(process.cwd(), this.system.environment), 'Restarting Ghost');
    }
}

RestartCommand.description = 'Restart the Ghost instance';
module.exports = RestartCommand;
