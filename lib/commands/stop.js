'use strict';
const Promise = require('bluebird');

const errors = require('../errors');
const Command = require('../command');

class StopCommand extends Command {
    run(argv) {
        if (argv.all) {
            return this.stopAll();
        }

        Command.checkValidInstall('stop');
        let instance = this.system.getInstance();

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
StopCommand.options = {
    all: {
        alias: 'a',
        description: 'option to stop all running Ghost blogs',
        type: 'boolean'
    }
};
StopCommand.global = true;

module.exports = StopCommand;
