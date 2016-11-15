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

        var resolveProcessManager = require('../process').resolve,
            KnexMigrator = require('knex-migrator'),
            spawn = require('child_process').spawn,
            Config = require('../utils/config'),
            config = Config.load('config.' + process.env.NODE_ENV + '.json'),
            path = require('path'),
            self = this,
            knexMigrator, pm;

        // knex-migrator needs to know the content path
        process.env.paths__contentPath = path.join(process.cwd(), 'content');

        knexMigrator = new KnexMigrator({
            knexMigratorFilePath: path.join(process.cwd(), 'current')
        });

        pm = resolveProcessManager(config);

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
                    stdio: [0, 1, 2, 'ipc']
                });

                self.child.on('error', function (error) {
                    self.ui.fail(error);
                    process.exit(1);
                });

                self.child.on('message', function (message) {
                    if (message.started) {
                        pm.success();
                        return;
                    }

                    pm.error(message.error);
                });
            }).catch(function (error) {
                pm.error(error.message);
            });
    },

    exit: function exit() {
        if (this.child) {
            this.child.kill();
        }
    }
});
