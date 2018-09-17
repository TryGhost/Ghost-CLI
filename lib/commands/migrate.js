'use strict';
const Command = require('../command');

class MigrateCommand extends Command {
    run(argv) {
        const parseNeededMigrations = require('../utils/needed-migrations');

        const instance = this.system.getInstance();

        return this.ui.run(
            () => this.system.hook('migrations'),
            'Checking for available migrations'
        ).then((extensionMigrations) => {
            const neededMigrations = parseNeededMigrations(
                instance.cliVersion,
                this.system.cliVersion,
                extensionMigrations
            );

            if (!neededMigrations.length) {
                if (!argv.quiet) {
                    this.ui.log('No migrations needed :)', 'green');
                }

                return Promise.resolve();
            }

            return this.ui.listr(neededMigrations, {instance: instance});
        }).then(() => {
            // Update the cli version in the cli config file
            instance.cliVersion = this.system.cliVersion;
        });
    }
}

MigrateCommand.description = 'Run system migrations on a Ghost instance';
MigrateCommand.runPreChecks = true;

module.exports = MigrateCommand;
