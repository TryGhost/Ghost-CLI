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

        process.env.NODE_ENV = (options.production || process.env.NODE_ENV === 'production') ?
            'production' : 'development';

        var KnexMigrator = require('knex-migrator'),
            merge = require('lodash/merge'),
            spawn = require('child_process').spawn,
            path = require('path'),
            self = this,
            knexMigrator;

        knexMigrator = new KnexMigrator({
            knexMigratorFilePath: path.join(process.cwd(), 'current')
        });

        return knexMigrator.isDatabaseOK()
            .catch(function (error) {
                if (error.code === 'DB_NOT_INITIALISED' ||
                    error.code === 'DATABASE_DOES_NOT_EXIST' ||
                    error.code === 'MIGRATION_TABLE_IS_MISSING') {
                    return knexMigrator.init();
                }

                throw error;
            }).then(function () {
                self.child = spawn(process.execPath, ['current/index.js'], {
                    cwd: process.cwd(),
                    stdio: [0, 1, 2, 'ipc'],
                    env: merge({
                        paths__contentPath: path.join(process.cwd(), 'content')
                    }, process.env)
                });

                self.child.on('error', function (error) {
                    self.ui.fail(error);
                    process.exit(1);
                });

                self.child.on('message', function (message) {
                    console.log(message);
                    if (message.started) {
                        self.sendMessage(message);
                        return;
                    }

                    self.sendMessage({started: false, error: message.error});
                });
            }).catch(function (error) {
                this.sendMessage({started: false, error: error.message});
            });
    },

    sendMessage: function sendMessage(message) {
        if (process.send) {
            process.send(message);
        }
    },

    exit: function exit() {
        if (this.child) {
            this.child.kill();
        }
    }
});
