'use strict';
const path = require('path');
const execa = require('execa');

const errors = require('../errors');
const shouldUseGhostUser = require('../utils/use-ghost-user');

module.exports = function runMigrations(context) {
    const config = context.instance.config;

    if (!config.has('paths.contentPath')) {
        config.set('paths.contentPath', path.join(context.instance.dir, 'content')).save();
    }

    const transports = config.get('logging.transports', null);
    config.set('logging.transports', ['file']).save();

    const contentDir = path.join(context.instance.dir, 'content');
    const currentDir = path.join(context.instance.dir, 'current');
    let knexMigratorPromise;

    const args = ['--init', '--mgpath', currentDir];

    // If we're using sqlite and the ghost user owns the content folder, then
    // we should run sudo, otherwise run normally
    if (shouldUseGhostUser(contentDir)) {
        const knexMigratorPath = path.resolve(context.instance.dir, 'current/node_modules/.bin/knex-migrator-migrate');
        knexMigratorPromise = context.ui.sudo(`${knexMigratorPath} ${args.join(' ')}`, {sudoArgs: '-E -u ghost'});
    } else {
        knexMigratorPromise = execa('knex-migrator-migrate', args, {
            preferLocal: true,
            localDir: path.join(context.instance.dir, 'current')
        });
    }

    return knexMigratorPromise.then(() => {
        config.set('logging.transports', transports).save();
    }).catch((error) => {
        if (error.stderr && error.stderr.match(/CODE: ENOTFOUND/)) {
            // Database not found
            error = new errors.ConfigError({
                config: {
                    'database.connection.host': config.get('database.connection.host')
                },
                message: 'Invalid database host',
                environment: context.instance.system.environment
            });
        } else if (error.stderr && error.stderr.match(/CODE: ER_ACCESS_DENIED_ERROR/)) {
            error = new errors.ConfigError({
                config: {
                    'database.connection.user': config.get('database.connection.user'),
                    'database.connection.password': config.get('database.connection.password')
                },
                message: 'Invalid database username or password',
                environment: context.instance.system.environment
            });
        } else if (error.stdout && error.stdout.match(/npm install sqlite3 --save/)) {
            // We check stdout because knex outputs to stdout on this particular error
            error = new errors.SystemError({
                message: 'It appears that sqlite3 did not install properly when Ghost-CLI was installed.\n' +
                    'Please either uninstall and reinstall Ghost-CLI, or switch to MySQL',
                help: 'https://docs.ghost.org/v1/docs/troubleshooting#section-sqlite3-install-failure'
            });
        }

        config.set('logging.transports', transports).save();
        return Promise.reject(error);
    });
}

