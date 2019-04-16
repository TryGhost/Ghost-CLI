'use strict';
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

    run(argv) {
        const errors = require('../errors');
        const ProcessManager = require('../process-manager');
        const checkValidInstall = require('../utils/check-valid-install');

        const runOptions = {quiet: argv.quiet};

        if (argv.all) {
            return this.stopAll();
        }

        const instance = this.system.getInstance(argv.name);

        if (argv.name) {
            if (!instance) {
                return Promise.reject(new errors.SystemError(`Ghost instance '${argv.name}' does not exist`));
            }

            process.chdir(instance.dir);
        }

        checkValidInstall('stop');

        return instance.running().then((isRunning) => {
            if (!isRunning) {
                this.ui.log('Ghost is already stopped! For more information, run', 'ghost ls', 'green', 'cmd', true);
                return Promise.resolve();
            }

            const stop = () => Promise.resolve(instance.process.stop(process.cwd())).then(() => {
                instance.running(null);
            });

            return this.ui.run(stop, 'Stopping Ghost', runOptions);
        }).then(() => {
            if (!argv.disable || !ProcessManager.supportsEnableBehavior(instance.process)) {
                return Promise.resolve();
            }

            return Promise.resolve(instance.process.isEnabled()).then((isEnabled) => {
                if (!isEnabled) {
                    return Promise.resolve();
                }

                return this.ui.run(
                    () => instance.process.disable(),
                    'Disabling Ghost instance startup on server boot',
                    runOptions
                );
            });
        });
    }

    stopAll() {
        const Promise = require('bluebird');

        const instances = this.system.getAllInstances(true);
        const cwd = process.cwd();

        return Promise.each(instances, (instance) => {
            process.chdir(instance.dir);
            return this.ui.run(() => this.run({quiet: true}), `Stopping Ghost: ${instance.name}`);
        }).then(() => {
            process.chdir(cwd);
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
