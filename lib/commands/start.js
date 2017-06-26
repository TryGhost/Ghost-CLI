'use strict';
const path = require('path');
const KnexMigrator = require('knex-migrator');

const Command = require('../command');
const errors = require('../errors');
const startupChecks = require('./doctor/checks/startup');

class StartCommand extends Command {
    run(argv) {
        this.system.loadInstanceConfig();

        return this.ui.listr(startupChecks, {system: this.system}).then(() => {
            if (this.system.localConfig.has('running')) {
                return Promise.reject(new errors.SystemError('Ghost is already running'));
            }

            this.service.setConfig(this.system.instanceConfig);

            process.env.paths__contentPath = path.join(process.cwd(), 'content');

            let transports = this.system.instanceConfig.get('logging.transports');
            // This is a bit of a hack, but since we can't pass an array via env vars
            // or cli params we have to do it via config :/
            this.system.instanceConfig.set('logging.transports', ['file']).save();

            let knexMigrator = new KnexMigrator({
                knexMigratorFilePath: path.join(process.cwd(), 'current')
            });

            let promise = knexMigrator.isDatabaseOK().catch((error) => {
                if (error.code === 'DB_NOT_INITIALISED' ||
                    error.code === 'MIGRATION_TABLE_IS_MISSING') {
                    return knexMigrator.init();
                } else if (error.code === 'DB_NEEDS_MIGRATION') {
                    return knexMigrator.migrate();
                }

                if (error.code === 'ENOTFOUND') {
                    // Database not found
                    error = new errors.ConfigError({
                        configKey: 'database.connection.host',
                        configValue: this.system.instanceConfig.get('database.connection.host'),
                        message: 'Invalid database host',
                        environment: this.environment
                    });
                } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
                    error = new errors.ConfigError({
                        configKey: 'database.connection.user',
                        configValue: this.system.instanceConfig.get('database.connection.user'),
                        message: 'Invalid database username or password',
                        environment: this.environment
                    });
                }

                // Reset transports
                this.system.instanceConfig.set('logging.transports', transports).save();
                return Promise.reject(error);
            }).then(() => {
                // Reset transports
                this.system.instanceConfig.set('logging.transports', transports).save();
            });

            return this.ui.run(promise, 'Running database migrations');
        }).then(() => {
            let start = () => Promise.resolve(this.service.process.start(process.cwd(), this.system.mode)).then(() => {
                this.system.localConfig.set('running', this.system.mode).save();
            });

            if (argv.quiet) {
                return start();
            }

            return this.ui.run(start, 'Starting Ghost').then(() => {
                this.ui.log(`You can access your blog at ${this.system.instanceConfig.get('url')}`, 'cyan');
            });
        });
    }
}

StartCommand.description = 'Start an instance of Ghost';

module.exports = StartCommand;
