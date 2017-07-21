'use strict';
const Command = require('../../command');
const errors = require('../../errors');

class DoctorCommand extends Command {
    run(argv) {
        let category = argv.category || 'install';
        let checks;

        try {
            checks = require('./checks/' + category);
        } catch (e) {
            if (e.code === 'MODULE_NOT_FOUND') {
                this.ui.fail('Invalid category of checks');
                return Promise.reject();
            }

            return Promise.reject(e);
        }

        return this.ui.listr(checks, {ui: this.ui, system: this.system}).then(() => {
            this.ui.success(`All ${category} checks passed`);
        }).catch((error) => {
            if (error instanceof errors.SystemError) {
                this.ui.log('\nChecks failed:', 'red');
                this.ui.log(`\n    ${error.message}\n`);
                return;
            }

            return Promise.reject(error);
        });
    }
}

DoctorCommand.description = 'Check the system for any potential hiccups when installing/updating Ghost';
DoctorCommand.longDescription = '$0 doctor [install|startup]\n Run various checks to determine potential problems with your environment.'
DoctorCommand.params = '[category]';
DoctorCommand.global = true;

module.exports = DoctorCommand;
