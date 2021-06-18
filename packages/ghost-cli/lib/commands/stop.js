const Command = require('../command');

class StopCommand extends Command {
    static configureOptions(commandName, yargs, extensions) {
        const get = require('lodash/get');
        const omit = require('lodash/omit');

        extensions.forEach((extension) => {
            const options = get(extension, 'config.options.stop', false);
            if (!options) {
                return;
            }

            Object.assign(this.options, omit(options, Object.keys(this.options)));
        });

        yargs = super.configureOptions(commandName, yargs, extensions);

        return yargs;
    }

    async run(argv) {
        const {SystemError} = require('../errors');
        const findValidInstall = require('../utils/find-valid-install');

        const runOptions = {quiet: argv.quiet};

        if (argv.all) {
            return this.stopAll();
        }

        if (!argv.name) {
            findValidInstall('stop', true);
        }

        const instance = this.system.getInstance(argv.name);

        if (argv.name && !instance) {
            throw new SystemError(`Ghost instance '${argv.name}' does not exist`);
        }

        const isRunning = await instance.isRunning();
        if (!isRunning) {
            this.ui.log('Ghost is already stopped! For more information, run', 'ghost ls', 'green', 'cmd', true);
            return;
        }

        await this.ui.run(() => instance.stop(argv.disable), `Stopping Ghost: ${instance.name}`, runOptions);
    }

    async stopAll() {
        const Promise = require('bluebird');

        const instances = this.system.getAllInstances(true);
        await Promise.each(instances, async ({name}) => {
            await this.ui.run(() => this.run({quiet: true, name}), `Stopping Ghost: ${name}`);
        });
    }
}

StopCommand.description = 'Stops an instance of Ghost';
StopCommand.params = '[name]';
StopCommand.options = {
    all: {
        alias: 'a',
        description: 'option to stop all running Ghost blogs',
        type: 'boolean'
    },
    disable: {
        description: 'Disable restarting Ghost on server reboot (if the process manager supports it)',
        type: 'boolean'
    }
};
StopCommand.global = true;

module.exports = StopCommand;
