'use strict';
const path = require('path');
const spawn = require('child_process').spawn;
const Command = require('../command');

class RunCommand extends Command {
    run() {
        // If the user is running this command directly, output a little note
        // telling them they're likely looking for `ghost start`
        if (process.stdin.isTTY) {
            this.ui.log('The `ghost run` command is used by the configured Ghost process manager and for debugging. ' +
                'If you\'re not running this to debug something, you should run `ghost start` instead.', 'yellow');
        }

        let instance = this.system.getInstance();
        instance.loadConfig(true);

        process.env.paths__contentPath = path.join(process.cwd(), 'content');

        this.child = spawn(process.execPath, ['current/index.js'], {
            cwd: process.cwd(),
            stdio: [0, 1, 2, 'ipc']
        });

        this.child.on('error', (error) => {
            this.ui.fail(error);
            process.exit(1);
        });

        this.child.on('message', (message) => {
            if (message.started) {
                instance.process.success();
                return;
            }

            instance.process.error(message.error);
        });
    }

    cleanup() {
        if (this.child) {
            this.child.kill();
        }
    }
}

RunCommand.description = 'Run a ghost instance directly (used by process managers and for debugging)';

module.exports = RunCommand;
