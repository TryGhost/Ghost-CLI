'use strict';
const spawn = require('child_process').spawn;
const Config = require('./config');

class Instance {
    constructor(ui, config, processManager) {
        this.ui = ui;
        this.config = config;
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
                this.register();
                this.processManager.success();
                return;
            }

            this.processManager.error(message.error);
        });
    }

    kill() {
        this.deregister();
        this.child.kill();
    }

    register() {
        let systemConfig = Config.load('system');
        let instances = systemConfig.get('instances', {});

        instances[process.cwd()] = {
            mode: process.env.NODE_ENV,
            url: this.config.get('url'),
            port: this.config.get('server.port'),
            process: this.config.get('process')
        };

        systemConfig.set('instances', instances).save();
    }

    deregister() {
        let systemConfig = Config.load('system');
        let instances = systemConfig.get('instances', {});
        delete instances[process.cwd()];
        systemConfig.set('instances', instances).save();
    }
}

module.exports = Instance;
