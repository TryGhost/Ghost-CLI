'use strict';
const Command = require('../../command');

class DoctorCommand extends Command {
    run(argv) {
        const includes = require('lodash/includes');

        const checks = require('./checks');
        const checkValidInstall = require('../../utils/check-valid-install');

        const checksToRun = argv.categories && argv.categories.length ?
            checks.filter((check) => argv.categories.some((cat) => includes(check.category, cat))) :
            checks;

        if (!checksToRun.length) {
            if (!argv.quiet) {
                const additional = argv.categories && argv.categories.length ? ` for categories "${argv.categories.join(', ')}"` : '';
                this.ui.log(`No checks found to run${additional}.`);
            }

            return Promise.resolve();
        }

        let instance;

        if (
            !argv.skipInstanceCheck &&
            !(argv.categories && argv.categories.length === 1 && argv.categories[0] === 'install')
        ) {
            checkValidInstall('doctor');
            instance = this.system.getInstance();
            instance.checkEnvironment();
        }

        const context = {
            argv: argv,
            system: this.system,
            instance: instance,
            ui: this.ui,
            local: argv.local || false,
            // This is set to true whenever the command is `ghost doctor` itself,
            // rather than something like `ghost start` or `ghost update`
            isDoctorCommand: Boolean(argv._ && argv._.length && argv._[0] === 'doctor')
        };

        return this.ui.listr(checksToRun, context, {exitOnError: false});
    }
}

DoctorCommand.description = 'Check the system for any potential hiccups when installing/updating Ghost';
DoctorCommand.longDescription = '$0 doctor [categories..]\n Run various checks to determine potential problems with your environment.'
DoctorCommand.params = '[categories..]';
DoctorCommand.global = true;

module.exports = DoctorCommand;
