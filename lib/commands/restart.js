'use strict';
const Command = require('../command');

class RestartCommand extends Command {
    run() {
        let instance = this.system.getInstance();

        if (!instance.running) {
            return Promise.reject(new Error('Ghost instance is not currently running.'));
        }

        instance.loadRunningEnvironment(true);

        return this.ui.run(instance.process.restart(process.cwd(), this.system.environment), 'Restarting Ghost');
    }
}

RestartCommand.description = 'Restart the Ghost instance';
module.exports = RestartCommand;
