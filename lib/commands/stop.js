'use strict';
const Promise = require('bluebird');

const errors = require('../errors');
const Command = require('../command');

class StopCommand extends Command {
    run(argv) {
        if (argv.all) {
            return this.stopAll();
        }

        let instance = this.system.getInstance(argv.name);

        if (argv.name) {
            if (!instance) {
                return Promise.reject(new errors.SystemError(`Ghost instance '${argv.name}' does not exist`));
            }

            process.chdir(instance.dir);
        }

        Command.checkValidInstall('stop');

        if (!instance.running) {
            return Promise.reject(new errors.SystemError('No running Ghost instance found here.'));
        }

        instance.loadRunningConfig();
        this.service.setConfig(instance.config);

        let stop = () => Promise.resolve(this.service.process.stop(process.cwd())).then(() => {
            instance.running = null;
        });

        if (argv.quiet) {
            return stop();
        }

        return this.ui.run(stop, 'Stopping Ghost');
    }

    stopAll() {
        let instances = this.system.getAllInstances(true);
        let cwd = process.cwd();

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
    }
};
StopCommand.global = true;

module.exports = StopCommand;
