'use strict';
const Command = require('../command');

class VersionCommand extends Command {
    run(argv = {}) {
        const os = require('os');
        const chalk = require('chalk').default;

        const cliVersion = this.system.cliVersion;
        const instance = this.system.getInstance();

        if (argv.json) {
            this.ui.output({
                cliVersion,
                // These will be null if we're not in a Ghost instance folder
                ghostVersion: instance.version || null,
                dir: instance.version ? instance.dir : null
            });
            return;
        }

        this.ui.log(`Ghost-CLI version: ${chalk.cyan(cliVersion)}`);

        // This will be false if we're not in a Ghost instance folder
        if (instance.version) {
            const dir = chalk.gray(`(at ${instance.dir.replace(os.homedir(), '~')})`);
            this.ui.log(`Ghost version: ${chalk.cyan(instance.version)} ${dir}`);
        }
    }
}

VersionCommand.description = 'Prints out Ghost-CLI version (and Ghost version if one exists)';
VersionCommand.global = true;
VersionCommand.allowRoot = true;
VersionCommand.options = {
    json: {
        describe: 'Output version data as JSON',
        type: 'boolean',
        default: false
    }
};

module.exports = VersionCommand;
