'use strict';
const get = require('lodash/get');
const omit = require('lodash/omit');

const Command = require('../command');
const startupChecks = require('./doctor/checks/startup');
const ProcessManager = require('../process-manager');

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
            return Promise.reject(new Error('Ghost is already running. Use `ghost ls` to see details.'));
        }

        instance.checkEnvironment();

        return this.ui.listr(startupChecks, {environment: this.system.environment, config: instance.config}).then(() => {
            let processInstance = instance.process;
            let start = () => Promise.resolve(processInstance.start(process.cwd(), this.system.environment)).then(() => {
                instance.running = this.system.environment;
            });

            if (argv.quiet) {
                return start();
            }

            return this.ui.run(start, 'Starting Ghost').then(() => {
                // If process manager doesn't support enable behavior OR
                // it's already enabled, then skip prompt
                if (!ProcessManager.supportsEnableBehavior(processInstance) || processInstance.isEnabled()) {
                    return Promise.resolve({yes: false});
                }

                // If prompts are disabled or enable is passed,
                // skip prompt
                if (argv.enable || !argv.prompt) {
                    return Promise.resolve({yes: argv.enable});
                }

                return this.ui.confirm('Do you wish to enable the Ghost instance to start on reboot?')
            }).then((answer) => {
                if (!answer.yes) {
                    return Promise.resolve();
                }

                return this.ui.run(processInstance.enable(), 'Enabling Ghost instance startup on server boot');
            }).then(() => {
                this.ui.log(`You can access your blog at ${instance.config.get('url')}`, 'cyan');

                if (instance.config.get('mail.transport') === 'Direct') {
                    this.ui.log('\nGhost uses direct mail by default', 'green');
                    this.ui.log('To set up an alternative email method read our docs at https://docs.ghost.org/docs/mail-config', 'green');
                }
            });
        });
    }
}

StartCommand.description = 'Start an instance of Ghost';
StartCommand.options = {
    enable: {
        description: 'Enable the instance to restart on server reboot (if the process manager supports it)',
        type: 'boolean'
    }
};

module.exports = StartCommand;
