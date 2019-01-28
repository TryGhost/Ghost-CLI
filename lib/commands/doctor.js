'use strict';
const Command = require('../command');

class DoctorCommand extends Command {
    run(argv) {
        const doctor = require('../tasks/doctor');

        return doctor(this.ui, this.system, argv.categories).then((listr) => {
            let instance;

            if (
                !argv.skipInstanceCheck &&
                !(argv.categories && argv.categories.length === 1 && argv.categories[0] === 'install')
            ) {
                const checkValidInstall = require('../utils/check-valid-install');

                checkValidInstall('doctor');
                instance = this.system.getInstance();
                instance.checkEnvironment();
            }

            return listr.run({
                argv,
                instance,
                system: this.system,
                ui: this.ui,
                local: argv.local || false,
                // This is set to true whenever the command is `ghost doctor` itself,
                // rather than something like `ghost start` or `ghost update`
                isDoctorCommand: true
            });
        });
    }
}

DoctorCommand.description = 'Check the system for any potential hiccups when installing/updating Ghost';
DoctorCommand.longDescription = '$0 doctor [categories..]\n Run various checks to determine potential problems with your environment.';
DoctorCommand.params = '[categories..]';
DoctorCommand.global = true;
DoctorCommand.options = {
    'check-mem': {
        alias: 'mem-check',
        description: '[--no-check-mem] Enable/Disable memory availability checks',
        type: 'boolean',
        default: true
    }
};

module.exports = DoctorCommand;
