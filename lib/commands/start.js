'use strict';
const Command = require('../command');

class StartCommand extends Command {
    static configureOptions(commandName, yargs, extensions) {
        const get = require('lodash/get');
        const omit = require('lodash/omit');

        extensions.forEach((extension) => {
            const options = get(extension, 'config.options.start', false);
            if (!options) {
                return;
            }

            Object.assign(this.options, omit(options, Object.keys(this.options)));
        });

        return super.configureOptions(commandName, yargs, extensions);
    }

    run(argv) {
        const DoctorCommand = require('./doctor');
        const ProcessManager = require('../process-manager');

        const instance = this.system.getInstance();
        const runOptions = {quiet: argv.quiet};

        return instance.running().then((isRunning) => {
            if (isRunning) {
                this.ui.log('Ghost is already running! Run `ghost ls` for more information', 'green');
                return Promise.resolve();
            }

            instance.checkEnvironment();

            return this.runCommand(DoctorCommand, Object.assign({
                categories: ['start'],
                quiet: true
            }, argv)).then(() => {
                const processInstance = instance.process;

                const start = () => {
                    return Promise.resolve(processInstance.start(process.cwd(), this.system.environment))
                        .then(() => { instance.running(this.system.environment); });
                };

                return this.ui.run(start, 'Starting Ghost', runOptions).then(() => {
                    // If process manager doesn't support enable behavior OR it's already enabled, don't try to enable
                    if (!ProcessManager.supportsEnableBehavior(processInstance) || processInstance.isEnabled()) {
                        argv.enable = false;
                    }

                    if (!argv.enable) {
                        return Promise.resolve();
                    }

                    return this.ui.run(processInstance.enable(), 'Enabling Ghost instance startup on server boot', runOptions);
                }).then(() => {
                    if (!argv.quiet) {
                        this.ui.log(`You can access your blog at ${instance.config.get('url')}`, 'cyan');

                        if (instance.config.get('mail.transport') === 'Direct') {
                            this.ui.log('\nGhost uses direct mail by default', 'green');
                            this.ui.log('To set up an alternative email method read our docs at https://docs.ghost.org/docs/mail-config', 'green');
                        }
                    }
                });
            });
        });
    }
}

StartCommand.description = 'Start an instance of Ghost';
StartCommand.options = {
    enable: {
        description: '[--no-enable] Enable/don\'t enable the instance to restart on server reboot (if the process manager supports it)',
        type: 'boolean',
        default: true
    }
};

module.exports = StartCommand;
