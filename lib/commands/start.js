'use strict';
const get = require('lodash/get');
const omit = require('lodash/omit');

const Command = require('../command');
const startupChecks = require('./doctor/checks/startup');
const runMigrations = require('../tasks/migrate');

class StartCommand extends Command {
    static configureOptions(commandName, yargs, extensions) {
        extensions.forEach((extension) => {
            let options = get(extension, 'config.options.start', false);
            if (!options) {
                return;
            }

            Object.assign(this.options, omit(options, Object.keys(this.options)));
        });

        return super.configureOptions(commandName, yargs, extensions);
    }

    run(argv) {
        let instance = this.system.getInstance();

        if (instance.running) {
            return Promise.reject(new Error('Ghost is already running.'));
        }

        instance.checkEnvironment();

        return this.ui.listr(startupChecks.concat({
            title: 'Running database migrations',
            task: runMigrations
        }), {environment: this.system.environment, config: instance.config}).then(() => {
            let start = () => Promise.resolve(instance.process.start(process.cwd(), this.system.environment)).then(() => {
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
