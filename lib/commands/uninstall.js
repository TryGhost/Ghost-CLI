'use strict';
const fs = require('fs-extra');
const path = require('path');

const StopCommand = require('./stop');
const Command = require('../command');

class UninstallCommand extends Command {
    run(argv) {
        let prompt;

        if (!argv.force && argv.prompt) {
            this.ui.log('WARNING: Running this command will delete all of your themes, images, data, and any files related to this Ghost instance!\n' +
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

            return this.ui.listr([{
                title: 'Stopping Ghost',
                skip: () => !instance.running,
                task: () => {
                    instance.loadRunningEnvironment(true);
                    // If the instance is currently running we need to make
                    // sure it gets stopped
                    return this.runCommand(StopCommand, {quiet: true});
                }
            }, {
                title: 'Removing related configuration',
                task: () => {
                    this.system.setEnvironment(!fs.existsSync(path.join(instance.dir, 'config.production.json')));
                    return this.system.hook('uninstall', instance);
                }
            }, {
                title: 'Removing Ghost installation',
                task: () => {
                    this.system.removeInstance(instance);
                    return Promise.all(fs.readdirSync('.').map(file => fs.remove(file)));
                }
            }]);
        });
    }
}

UninstallCommand.description = 'Remove a Ghost instance and any related configuration files';
UninstallCommand.options = {
    force: {
        alias: 'f',
        description: 'Don\'t confirm deletion',
        type: 'boolean'
    }
};

module.exports = UninstallCommand;
