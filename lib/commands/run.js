'use strict';
const path = require('path');
const Command = require('../command');
const Instance = require('../utils/instance');

class RunCommand extends Command {
    run() {
        // If the user is running this command directly, output a little note
        // telling them they're likely looking for `ghost start`
        if (process.stdin.isTTY) {
            this.ui.log('The `ghost run` command is used by the configured Ghost process manager and for debugging. ' +
                'If you\'re not running this to debug something, you should run `ghost start` instead.', 'yellow');
        }

        this.system.loadInstanceConfig();

        process.env.paths__contentPath = path.join(process.cwd(), 'content');
        this.service.setConfig(this.system.instanceConfig);
        this.instance = new Instance(this.ui, this.service.process);
    }

    cleanup() {
        if (this.instance) {
            this.instance.kill();
        }
    }
}

RunCommand.description = 'Run a ghost instance directly (used by process managers and for debugging)';

module.exports = RunCommand;
