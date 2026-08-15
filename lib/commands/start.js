'use strict';
const Command = require('../command');
const DoctorCommand = require('./doctor');

class StartCommand extends Command {
    static configureOptions(commandName, yargs, extensions) {
        extensions.forEach((extension) => {
            const options = extension.config?.options?.start ?? false;
            if (!options) {
                return;
            }

            // Extension options don't override the command's own options
            Object.entries(options).forEach(([name, option]) => {
                if (!Object.hasOwn(this.options, name)) {
                    this.options[name] = option;
                }
            });
        });

        yargs = super.configureOptions(commandName, yargs, extensions);
        yargs = DoctorCommand.configureOptions('doctor', yargs, extensions, true);

        return yargs;
    }

    async run(argv) {
        const getInstance = require('../utils/get-instance');

        const runOptions = {quiet: argv.quiet};
        const instance = getInstance({
            name: argv.name,
            system: this.system,
            command: 'start',
            recurse: !argv.dir
        });

        argv.local = instance.isLocal;
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

        await this.runCommand(DoctorCommand, {categories: ['start'], ...argv, quiet: true, skipInstanceCheck: true});
        await this.ui.run(() => instance.start(argv.enable), `Starting Ghost: ${instance.name}`, runOptions);

        if (!argv.quiet) {
            let adminUrl = instance.config.get('admin.url', instance.config.get('url', ''));
            // Strip the trailing slash and add the admin path
            adminUrl = `${adminUrl.replace(/\/$/,'')}/ghost/`;

            this.ui.log('\n------------------------------------------------------------------------------', 'white');
            this.ui.log('Your admin interface is located at', adminUrl, 'green', 'link', true);
        }
    }
}

StartCommand.description = 'Start an instance of Ghost';
StartCommand.params = '[name]';
StartCommand.options = {
    enable: {
        description: '[--no-enable] Enable/don\'t enable instance restart on server reboot (if the process manager supports it)',
        type: 'boolean',
        default: true
    }
};
StartCommand.global = true;

module.exports = StartCommand;
