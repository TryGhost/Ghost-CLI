'use strict';
const spawn = require('child_process').spawn;

class Instance {
    constructor(ui, processManager) {
        this.ui = ui;
        this.processManager = processManager;

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
                this.processManager.success();
                return;
            }

            this.processManager.error(message.error);
        });
    }

    kill() {
        this.child.kill();
    }
}

module.exports = Instance;
