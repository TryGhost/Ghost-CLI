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

    async run(argv) {
        const instance = this.system.getInstance();
        const runOptions = {quiet: argv.quiet};

        const isRunning = await instance.isRunning();
        if (isRunning) {
            this.ui.log('Ghost is already running! For more information, run', 'ghost ls', 'green', 'cmd', true);
            return;
        }

        instance.checkEnvironment();
        await this.runCommand(DoctorCommand, {categories: ['start'], ...argv, quiet: true});
        await this.ui.run(() => instance.start(argv.enable), `Starting Ghost: ${instance.name}`, runOptions);

        if (!argv.quiet) {
            const isInstall = process.argv[2] === 'install';
            let adminUrl = instance.config.get('admin.url') || instance.config.get('url');
            // Strip the trailing slash and add the admin path
            adminUrl = `${adminUrl.replace(/\/$/,'')}/ghost/`;

            // Show a warning about direct mail - but in grey, it's not the most important message here
            if (isInstall && instance.config.get('mail.transport') === 'Direct') {
                this.ui.log('\nGhost uses direct mail by default. To set up an alternative email method read our docs at https://ghost.org/docs/concepts/config/#mail', 'gray');
            }

            this.ui.log('\n------------------------------------------------------------------------------', 'white');

            if (isInstall) {
                // Show a different message after a fresh install
                this.ui.log('Ghost was installed successfully! To complete setup of your publication, visit', adminUrl, 'green', 'link', true);
            } else {
                this.ui.log('Your admin interface is located at', adminUrl, 'green', 'link', true);
            }
        }
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
