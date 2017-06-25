'use strict';
const Config = require('../utils/config');
const Command = require('../command');
const StartCommand = require('./start');
const StopCommand = require('./stop');

class RestartCommand extends Command {
    run(argv) {
        let config = Config.load('.ghost-cli');

        if (!config.has('running')) {
            return Promise.reject(new Error('Ghost instance is not currently running.'));
        }

        this.environment = config.get('running');

        let stop = new StopCommand(this);
        let start = new StartCommand(this);

        return stop.run(argv).then(() => start.run(argv));
    }
}

RestartCommand.description = 'Restart the ghost instance';
module.exports = RestartCommand;
