'use strict';
const fs = require('fs');
const path = require('path');

const Config = require('../utils/config');
const Command = require('../command');
const startupChecks = require('./doctor/checks/startup');
const runMigrations = require('../tasks/migrate');

class StartCommand extends Command {
    run(argv) {
        let config, cliConfig;

        // If we are starting in production mode but a development config exists and a production config doesn't,
        // we want to start in development mode anyways.
        if (!this.development && fs.existsSync(path.join(process.cwd(), 'config.development.json')) &&
                !fs.existsSync(path.join(process.cwd(), 'config.production.json'))) {
            this.ui.log('Found a development config but not a production config, starting in development mode instead.', 'yellow');
            this.development = false;
            process.env.NODE_ENV = this.environment = 'development';
        }

        config = Config.load(this.environment);
        cliConfig = Config.load('.ghost-cli');

        if (cliConfig.has('running')) {
            return Promise.reject(new Error('Ghost is already running.'));
        }

        return this.ui.listr(startupChecks.concat({
            title: 'Running database migrations',
            task: runMigrations
        }), {environment: this.environment, config: config}).then(() => {
            this.service.setConfig(config);

            let start = () => Promise.resolve(this.service.process.start(process.cwd(), this.environment)).then(() => {
                let systemConfig = Config.load('system');
                let instance = systemConfig.get(`instances.${config.get('pname')}`, {});
                instance.mode = this.environment;
                systemConfig.save();

                cliConfig.set('running', this.environment).save();
                return Promise.resolve();
            });

            if (argv.quiet) {
                return start();
            }

            return this.ui.run(start, 'Starting Ghost').then(() => {
                this.ui.log(`You can access your blog at ${config.get('url')}`, 'cyan');
            });
        });
    }
}

StartCommand.description = 'Start an instance of Ghost';

module.exports = StartCommand;
