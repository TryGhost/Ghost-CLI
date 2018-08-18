'use strict';
const Command = require('../command');
const DoctorCommand = require('./doctor');

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

        yargs = super.configureOptions(commandName, yargs, extensions);
        return DoctorCommand.configureOptions('doctor', yargs, extensions, true);
    }

    run(argv) {
        const ProcessManager = require('../process-manager');
        const chalk = require('chalk');

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

                const start = () => Promise.resolve(processInstance.start(process.cwd(), this.system.environment))
                    .then(() => {
                        instance.running(this.system.environment); 
                    });

                return this.ui.run(start, 'Starting Ghost', runOptions).then(() => {
                    if (!argv.enable || !ProcessManager.supportsEnableBehavior(processInstance)) {
                        return Promise.resolve();
                    }

                    return Promise.resolve(processInstance.isEnabled()).then((isEnabled) => {
                        if (isEnabled) {
                            return Promise.resolve();
                        }

                        return this.ui.run(() => processInstance.enable(), 'Enabling Ghost instance startup on server boot', runOptions);
                    });
                }).then(() => {
                    if (!argv.quiet) {
                        const isInstall = process.argv[2] === 'install';
                        let adminUrl = instance.config.get('admin.url') || instance.config.get('url');

                        // Strip the trailing slash and add the admin path
                        adminUrl = `${adminUrl.replace(/\/$/,'')}/ghost/`;

                        this.ui.log(`You can access your publication at ${chalk.cyan(instance.config.get('url'))}`, 'white');

                        if (isInstall) {
                            // Show a different message after a fresh install
                            this.ui.log(`Next, go to to your admin interface at ${chalk.cyan(adminUrl)} to complete the setup of your publication`, 'white');
                        } else {
                            this.ui.log(`Your admin interface is located at ${chalk.cyan(adminUrl)}`, 'white');
                        }

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
