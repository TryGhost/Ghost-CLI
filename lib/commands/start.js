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
        yargs = DoctorCommand.configureOptions('doctor', yargs, extensions, true);

        return yargs;
    }

    run(argv) {
        const ProcessManager = require('../process-manager');

        const instance = this.system.getInstance();
        const runOptions = {quiet: argv.quiet};

        return instance.running().then((isRunning) => {
            if (isRunning) {
                this.ui.log('Ghost is already running! For more information, run', 'ghost ls', 'green', 'cmd', true);
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

                        // Show a warning about direct mail - but in grey, it's not the most important message here
                        if (isInstall && instance.config.get('mail.transport') === 'Direct') {
                            this.ui.log('\nGhost uses direct mail by default. To set up an alternative email method read our docs at https://docs.ghost.org/concepts/config/#mail', 'gray');
                        }

                        this.ui.log('\n------------------------------------------------------------------------------', 'white');

                        if (isInstall) {
                            // Show a different message after a fresh install
                            this.ui.log('Ghost was installed successfully! To complete setup of your publication, visit', adminUrl, 'green', 'link', true);
                        } else {
                            this.ui.log('Your admin interface is located at', adminUrl, 'green', 'link', true);
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
        description: '[--no-enable] Enable/don\'t enable instance restart on server reboot (if the process manager supports it)',
        type: 'boolean',
        default: true
    }
};

module.exports = StartCommand;
