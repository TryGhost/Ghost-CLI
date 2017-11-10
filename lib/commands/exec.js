'use strict';
const path = require('path');
const execa = require('execa');

const errors = require('../errors');
const Command = require('../command');
const useGhostUser = require('../utils/use-ghost-user');
const RepairPermissionsCommand = require('./repair-permissions');

class ExecCommand extends Command {
    run(argv) {
        if (process.argv.length < 4) {
            throw new errors.CliError({
                message: 'You must supply a command to run.',
                log: false
            });
        }

        let instance = this.system.getInstance();
        let commandToRun = process.argv.slice(3).join(' ');
        let promise;

        if (useGhostUser(path.join(instance.dir, 'content'))) {
            // We only need to run sudo if the content folder is actually owned by the ghost user.
            promise = this.ui.sudo(commandToRun).then(
                () => this.runCommand(RepairPermissionsCommand, argv)
            );
        } else {
            // Content folder is not owned by the ghost user, we can just
            // run the command normally
            promise = execa.shell(commandToRun);
        }

        return promise;
    }
}

ExecCommand.description = 'Execute a command as sudo, but clean up user permissions afterwards';
ExecCommand.longDescription = '$0 exec <cmd>\n Execute a command as sudo and clean up permissions afterward';

module.exports = ExecCommand;
