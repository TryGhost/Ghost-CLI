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
        const getInstance = require('../utils/get-instance');

        const runOptions = {quiet: argv.quiet};
        const instance = getInstance(argv.name, this.system, 'start');

        const isRunning = await instance.isRunning();
        if (isRunning) {
            this.ui.log('Ghost is already running! For more information, run', 'ghost ls', 'green', 'cmd', true);
            return;
        }

        instance.checkEnvironment();

        if (this.system.environment === 'production' && instance.config.get('url', '').startsWith('http://')) {
            this.ui.log([
                'Using https on all URLs is highly recommended. In production, SSL is required when using Stripe.',
                'Support for non-https admin URLs in production mode is deprecated and will be removed in a future version.'
            ].join('\n'), 'yellow');
        }

        await this.runCommand(DoctorCommand, {categories: ['start'], ...argv, quiet: true});
        await this.ui.run(() => instance.start(argv.enable), `Starting Ghost: ${instance.name}`, runOptions);

        if (!argv.quiet) {
            const chalk = require('chalk');
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
    }
}

StartCommand.global = true;
StartCommand.description = 'Start an instance of Ghost';
StartCommand.longDescription = '$0 start [name]\n Starts a known instance of Ghost';
StartCommand.params = '[name]';
StartCommand.options = {
    enable: {
        description: '[--no-enable] Enable/don\'t enable instance restart on server reboot (if the process manager supports it)',
        type: 'boolean',
        default: true
    }
};

module.exports = StartCommand;
