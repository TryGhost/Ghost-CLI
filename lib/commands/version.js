'use strict';
const Command = require('../command');

class VersionCommand extends Command {
    run() {
        const os = require('os');
        const chalk = require('chalk');

        const cliVersion = this.system.cliVersion;
        this.ui.log(`Ghost-CLI version: ${chalk.cyan(cliVersion)}`);

        const instance = this.system.getInstance();
        // This will be false if we're not in a Ghost instance folder
        if (instance.cliConfig.has('active-version')) {
            const dir = chalk.gray(`(at ${instance.dir.replace(os.homedir(), '~')})`);
            this.ui.log(`Ghost Version ${dir}: ${chalk.cyan(instance.cliConfig.get('active-version'))}`);
        }
    }
}

VersionCommand.description = 'Prints out Ghost-CLI version (and Ghost version if one exists)';
VersionCommand.global = true;
VersionCommand.allowRoot = true;

module.exports = VersionCommand;
