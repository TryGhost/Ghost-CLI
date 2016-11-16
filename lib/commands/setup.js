var BaseCommand = require('./base'),
    advancedOptions = require('./config/advanced');

module.exports = {
    name: 'setup',
    description: 'setup an installation of Ghost (after it is installed)',

    options: [{
        name: 'no-stack',
        description: 'Don\'t check the system stack on setup',
        flag: true
    }, {
        name: 'local',
        alias: 'l',
        description: 'Quick setup for a local installation of Ghost',
        flag: true
    }].concat(advancedOptions)
};

module.exports.Command = BaseCommand.extend({
    execute: function (options) {
        this.checkValidInstall();

        var local = options.local || false,
            Promise = require('bluebird'),
            path = require('path'),
            self = this;

        delete options.local;

        if (local) {
            options.url = 'http://localhost:2368/';
            options.pname = 'ghost-local';
            options.db = 'sqlite3';
            options.dbpath = path.join(process.cwd(), 'content/data/ghost-local.db');
            options.environment = 'development';
        }

        return this.runCommand('config', null, null, options).then(function setupChecks() {
            if (!options.stack) {
                return Promise.resolve();
            }

            return self.runCommand('doctor', 'setup').catch(function sysStackError(error) {
                if (error) {throw error;}

                self.ui.log(
                    'You are attempting to setup Ghost on a different system stack than is recommended\n' +
                    'If you are simply missing items, please install them and run `ghost setup` again\n' +
                    'However, if you wish to proceed on a different system stack, run `ghost setup --no-stack`\n' +
                    'Note, however, that certain CLI features may not work as well, or at all\n',
                    // TODO: add link to documentation
                    'yellow'
                );

                return Promise.reject();
            });
        }).then(function afterConfig() {
            // If 'local' is specified we will automatically start ghost
            if (local) {
                return Promise.resolve({start: true});
            }

            return self.ui.prompt({
                type: 'confirm',
                name: 'start',
                message: 'Do you want to start Ghost?',
                default: true
            });
        }).then(function shouldWeStart(answer) {
            if (!answer.start) {
                return Promise.resolve();
            }

            return self.runCommand('start', {development: local});
        });
    }
});
