'use strict';
const path = require('path');
const KnexMigrator = require('knex-migrator');

const errors = require('../errors');

module.exports = function runMigrations(context) {
    let config = context.instance.config;

    if (!config.has('paths.contentPath')) {
        config.set('paths.contentPath', path.join(context.instance.dir, 'content')).save();
    }

    let transports = config.get('logging.transports', null);
    // TODO: revisit just hiding migration output altogether
    config.set('logging.transports', []).save();

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
                config: {
                    'database.connection.host': config.get('database.connection.host')
                },
                message: 'Invalid database host',
                environment: context.instance.system.environment
            });
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            error = new errors.ConfigError({
                config: {
                    'database.connection.user': config.get('database.connection.user'),
                    'database.connection.password': config.get('database.connection.password')
                },
                message: 'Invalid database username or password',
                environment: context.instance.system.environment
            });
        }

        config.set('logging.transports', transports).save();
        return Promise.reject(error);
    }).then(() => {
        config.set('logging.transports', transports).save();
    });
}

