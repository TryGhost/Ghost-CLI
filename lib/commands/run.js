var BaseCommand = require('./base');

module.exports = {
    name: 'run',
    description: 'start a managed ghost process',
    options: [{
        name: 'production',
        alias: 'p',
        description: 'Run ghost in production mode',
        flag: true
    }]
};

module.exports.Command = BaseCommand.extend({
    execute: function execute(options) {
        // ensure we are within a valid ghost install
        this.checkValidInstall();

        var spawn = require('child_process').spawn,
            assign = require('lodash/assign'),
            self = this;

        this.child = spawn(process.execPath, ['current/index.js'], {
            cwd: process.cwd(),
            stdio: [0, 1, 2, 'ipc'],
            env: assign({
                NODE_ENV: (options.production || process.env.NODE_ENV === 'production') ?
                    'production' : 'development'
            }, process.env)
        });

        this.child.on('error', function (error) {
            self.ui.fail(error);
            process.exit(1);
        });
    },

    exit: function exit() {
        if (this.child) {
            this.child.kill();
        }
    }
});
