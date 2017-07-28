'use strict';
const path = require('path');
const execa = require('execa');

const errors = require('../errors');
const shouldUseGhostUser = require('../utils/use-ghost-user');

module.exports = function runMigrations(context) {
    let config = context.instance.config;

    if (!config.has('paths.contentPath')) {
        config.set('paths.contentPath', path.join(context.instance.dir, 'content')).save();
    }

    let transports = config.get('logging.transports', null);
    config.set('logging.transports', ['file']).save();

    let contentDir = path.join(context.instance.dir, 'content');
    let currentDir = path.join(context.instance.dir, 'current');
    let knexMigratorPromise;

    let args = ['--init', '--mgpath', currentDir];

    // If we're using sqlite and the ghost user owns the content folder, then
    // we should run sudo, otherwise run normally
    if (shouldUseGhostUser(contentDir)) {
        let knexMigratorPath = path.resolve(__dirname, '../../node_modules/.bin/knex-migrator-migrate');
        knexMigratorPromise = context.ui.sudo(`-E -u ghost ${knexMigratorPath} ${args.join(' ')}`, {
            stdio: ['inherit', 'inherit', 'pipe']
        });
    } else {
        knexMigratorPromise = execa('knex-migrator-migrate', args, {
            preferLocal: true,
            localDir: __dirname
        });
    }

    return knexMigratorPromise.then(() => {
        config.set('logging.transports', transports).save();
    }).catch((error) => {
        if (error.stderr.match(/CODE\: ENOTFOUND/)) {
            // Database not found
            error = new errors.ConfigError({
                config: {
                    'database.connection.host': config.get('database.connection.host')
                },
                message: 'Invalid database host',
                environment: context.instance.system.environment
            });
        } else if (error.stderr.match(/CODE\: ER_ACCESS_DENIED_ERROR/)) {
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
    });
}

