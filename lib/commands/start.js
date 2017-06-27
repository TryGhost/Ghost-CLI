'use strict';
const Command = require('../command');
const startupChecks = require('./doctor/checks/startup');
const runMigrations = require('../tasks/migrate');

class StartCommand extends Command {
    run(argv) {
        let instance = this.system.getInstance();

        if (instance.running) {
            return Promise.reject(new Error('Ghost is already running.'));
        }

        instance.loadConfig();

        return this.ui.listr(startupChecks.concat({
            title: 'Running database migrations',
            task: runMigrations
        }), {environment: this.system.environment, config: instance.config}).then(() => {
            this.service.setConfig(instance.config);

            let start = () => Promise.resolve(this.service.process.start(process.cwd(), this.system.environment)).then(() => {
                instance.running = this.system.environment;
            });

            if (argv.quiet) {
                return start();
            }

            return this.ui.run(start, 'Starting Ghost').then(() => {
                this.ui.log(`You can access your blog at ${instance.config.get('url')}`, 'cyan');
            });
        });
    }
}

StartCommand.description = 'Start an instance of Ghost';

module.exports = StartCommand;
