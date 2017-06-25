'use strict';
const Listr     = require('listr');
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

        let tasks = new Listr(checks, {concurrent: true, renderer: this.renderer});

        return tasks.run(this).then(() => {
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
DoctorCommand.params = '[name]';
DoctorCommand.global = true;

module.exports = DoctorCommand;
