'use strict';
const os = require('os');
const chalk = require('chalk');
const Command = require('../command');

class VersionCommand extends Command {
    run() {
        let cliVersion = this.system.cliVersion;
        this.ui.log(`Ghost-CLI version: ${chalk.cyan(cliVersion)}`);

        let instance = this.system.getInstance();
        // This will be false if we're not in a Ghost instance folder
        if (instance.cliConfig.has('active-version')) {
            let dir = chalk.gray(`(at ${instance.dir.replace(os.homedir(), '~')})`);
            this.ui.log(`Ghost Version ${dir}: ${chalk.cyan(instance.cliConfig.get('active-version'))}`);
        }
    }
}

VersionCommand.description = 'Prints out Ghost-CLI version (and ghost version if one exists)';
VersionCommand.global = true;

module.exports = VersionCommand;
