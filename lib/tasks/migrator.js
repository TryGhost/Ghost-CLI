'use strict';
const path = require('path');
const execa = require('execa');

const errors = require('../errors');
const ghostUser = require('../utils/use-ghost-user');

const errorHandler = (context) => {
    const {config} = context.instance;

    return (error) => {
        if (error.stderr && error.stderr.match(/No migrations available to rollback/)) {
            return Promise.resolve();
        } else if (error.stderr && error.stderr.match(/CODE: ENOTFOUND/)) {
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
                'You can either uninstall and reinstall Ghost-CLI, or switch to MySQL',
                help: 'https://docs.ghost.org/faq/errors/'
            });
        } else {
            // only show suggestion on `ghost update`
            error = new errors.GhostError({
                message: 'The database migration in Ghost encountered an error.',
                stderr: error.stderr,
                environment: context.instance.system.environment,
                help: 'https://docs.ghost.org/faq/upgrade-to-ghost-2-0/#what-to-do-when-an-upgrade-fails',
                suggestion: process.argv.slice(2, 3).join(' ') === 'update' ? 'ghost update --rollback' : null
            });
        }

        return Promise.reject(error);
    };
};

module.exports.migrate = function runMigrations(context) {
    const {dir} = context.instance;

    const contentDir = path.join(dir, 'content');
    const currentDir = path.join(dir, 'current');
    let knexMigratorPromise;

    const args = ['--init', '--mgpath', currentDir];

    // If we're using sqlite and the ghost user owns the content folder, then
    // we should run sudo, otherwise run normally
    if (ghostUser.shouldUseGhostUser(contentDir)) {
        const knexMigratorPath = path.resolve(dir, 'current/node_modules/.bin/knex-migrator-migrate');
        knexMigratorPromise = context.ui.sudo(`${knexMigratorPath} ${args.join(' ')}`, {sudoArgs: '-E -u ghost'});
    } else {
        knexMigratorPromise = execa('knex-migrator-migrate', args, {
            preferLocal: true,
            localDir: path.join(dir, 'current')
        });
    }

    return knexMigratorPromise.catch(errorHandler(context));
};

module.exports.rollback = function runRollback(context) {
    const {dir, version, previousVersion} = context.instance;
    const semver = require('semver');

    const contentDir = path.join(dir, 'content');
    const currentDir = path.join(dir, 'current');
    let knexMigratorPromise, args;

    // Ghost 2.0.0 uses the new knex-migrator version. We have to ensure you can still use CLI 1.9 with an older blog, because
    // we haven't restricted a CLI version range in Ghost (we only used cli: > X.X.X)
    if (semver.major(version) === 2) {
        args = ['--force', '--v', previousVersion, '--mgpath', currentDir];
    } else {
        args = ['--force', '--mgpath', currentDir];
    }

    // If we're using sqlite and the ghost user owns the content folder, then
    // we should run sudo, otherwise run normally
    if (ghostUser.shouldUseGhostUser(contentDir)) {
        const knexMigratorPath = path.resolve(dir, 'current/node_modules/.bin/knex-migrator-rollback');
        knexMigratorPromise = context.ui.sudo(`${knexMigratorPath} ${args.join(' ')}`, {sudoArgs: '-E -u ghost'});
    } else {
        knexMigratorPromise = execa('knex-migrator-rollback', args, {
            preferLocal: true,
            localDir: path.join(dir, 'current')
        });
    }

    return knexMigratorPromise.catch(errorHandler(context));
};
