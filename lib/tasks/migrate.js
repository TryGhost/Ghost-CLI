'use strict';
const path = require('path');
const KnexMigrator = require('knex-migrator');

const errors = require('../errors');

module.exports = function runMigrations(context) {
    process.env.paths__contentPath = path.join(process.cwd(), 'content');
    let config = context.config;

    let transports = config.get('logging.transports', null);
    config.set('logging.transports', ['file']).save();

    let knexMigrator = new KnexMigrator({
        knexMigratorFilePath: path.join(process.cwd(), 'current')
    });

    return knexMigrator.isDatabaseOK().catch((error) => {
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
                configValue: config.get('database.connection.host'),
                message: 'Invalid database host',
                environment: context.environment
            });
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            error = new errors.ConfigError({
                configKey: 'database.connection.user',
                configValue: config.get('database.connection.user'),
                message: 'Invalid database username or password',
                environment: context.environment
            });
        }

        config.set('logging.transports', transports).save();
        return Promise.reject(error);
    }).then(() => {
        config.set('logging.transports', transports).save();
    });
}

