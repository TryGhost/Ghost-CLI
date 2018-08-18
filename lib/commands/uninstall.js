'use strict';
const Command = require('../command');

class UninstallCommand extends Command {
    run(argv) {
        const fs = require('fs-extra');
        const path = require('path');

        const StopCommand = require('./stop');
        const ghostUser = require('../utils/use-ghost-user');

        if (!argv.force) {
            this.ui.log('WARNING: Running this command will delete all of your themes, images, data, any files related to this Ghost instance, and the contents of this folder!\n' +
                'There is no going back!', 'yellow');
        }

        const instance = this.system.getInstance();

        return this.ui.confirm('Are you sure you want to do this?', argv.force).then((confirmed) => {
            if (!confirmed) {
                return Promise.reject(false);
            }

            return this.ui.listr([{
                title: 'Stopping Ghost',
                task: (_, task) => instance.running().then((isRunning) => {
                    if (!isRunning) {
                        return task.skip('Instance is not running');
                    }

                    instance.loadRunningEnvironment(true);
                    // If the instance is currently running we need to make sure
                    // it gets stopped and disabled if possible
                    return this.runCommand(StopCommand, {quiet: true, disable: true});
                })
            }, {
                title: 'Removing content folder',
                enabled: () => ghostUser.shouldUseGhostUser(path.join(instance.dir, 'content')),
                task: () => this.ui.sudo(`rm -rf ${path.join(instance.dir, 'content')}`)
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
