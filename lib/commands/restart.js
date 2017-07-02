'use strict';
const Command = require('../command');
const StartCommand = require('./start');
const StopCommand = require('./stop');

class RestartCommand extends Command {
    run(argv) {
        let instance = this.system.getInstance();

        if (!instance.running) {
            return Promise.reject(new Error('Ghost instance is not currently running.'));
        }

        instance.loadRunningEnvironment(true, true);

        return this.runCommand(StopCommand, argv).then(() => this.runCommand(StartCommand, argv));
    }
}

RestartCommand.description = 'Restart the ghost instance';
module.exports = RestartCommand;
