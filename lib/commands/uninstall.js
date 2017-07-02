'use strict';
const fs = require('fs-extra');

const StopCommand = require('./stop');
const Command = require('../command');

class UninstallCommand extends Command {
    run(argv) {
        let prompt;

        if (!argv.force) {
            this.ui.log('WARNING: Running this command will delete all of your themes, images, data, and any files related to this ghost instance!\n' +
                'There is no going back!', 'yellow');

            prompt = this.ui.prompt({
                type: 'confirm',
                name: 'sure',
                message: 'Are you sure you want to do this?',
                default: false
            });
        }

        let instance = this.system.getInstance();

        return (prompt || Promise.resolve({sure: true})).then((answer) => {
            if (!answer.sure) {
                return Promise.reject(false);
            }

            if (!instance.running) {
                return Promise.resolve();
            }

            instance.loadRunningEnvironment(true);

            // If the instance is currently running we need to make
            // sure it gets stopped
            return this.runCommand(StopCommand);
        }).then(() => {
            this.system.setEnvironment(!fs.existsSync('config.production.json'));

            return this.ui.run(this.system.hook('uninstall', instance), 'Removing related configuration');
        }).then(() => this.ui.run(() => {
            this.system.removeInstance(instance);
            return Promise.all(fs.readdirSync('.').map(file => fs.remove(file)));
        }, 'Removing Ghost installation'));
    }
}

UninstallCommand.description = 'Remove a Ghost instance and any related configuration files';
UninstallCommand.options = {
    force: {
        alias: 'f',
        description: 'Don\'t confirm deletion',
        type: 'boolean'
    }
}

module.exports = UninstallCommand;
