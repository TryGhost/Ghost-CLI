'use strict';
const Command = require('../../command');

class DoctorCommand extends Command {
    run(argv) {
        const chalk = require('chalk');
        const includes = require('lodash/includes');

        const checks = require('./checks');
        const checkValidInstall = require('../../utils/check-valid-install');

        const checksToRun = argv.categories && argv.categories.length ?
            checks.filter((check) => argv.categories.some((cat) => includes(check.category, cat))) :
            checks;

        if (!checksToRun.length) {
            if (!argv.quiet) {
                const additional = argv.categories && argv.categories.length ? ` for categories '${argv.categories.join(', ')}'` : '';
                this.ui.log(`No checks found to run${additional}.`);
            }

            return Promise.resolve();
        }

        let instance;

        if (!argv.skipInstanceCheck) {
            checkValidInstall('doctor');
            instance = this.system.getInstance();
            instance.checkEnvironment();
        }

        const context = {
            argv: argv,
            system: this.system,
            instance: instance,
            ui: this.ui,
            local: argv.local || false
        };

        return this.ui.listr(checksToRun, context).catch((error) => {
            if (!argv.quiet) {
                this.ui.log('\nChecks failed!', 'red');
                this.ui.log(`${chalk.yellow('Message:')} ${error.message}\n`);
            }

            return Promise.reject(error);
        });
    }
}

DoctorCommand.description = 'Check the system for any potential hiccups when installing/updating Ghost';
DoctorCommand.longDescription = '$0 doctor [install|startup]\n Run various checks to determine potential problems with your environment.'
DoctorCommand.params = '[categories..]';
DoctorCommand.global = true;

module.exports = DoctorCommand;
