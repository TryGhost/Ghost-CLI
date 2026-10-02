'use strict';
const {execa} = require('execa');

const {ProcessError, SystemError} = require('../../errors');

const MYSQL_CLIENTS = ['mysql', 'mysql2'];

/**
 * Refuses TLS settings that this mysqldump adapter cannot faithfully translate.
 * Never include certificate/key values in errors or silently drop TLS policy.
 *
 * @param {object} connection Ghost's database connection configuration
 */
function validateConnection(connection) {
    if (connection.ssl !== undefined && connection.ssl !== null && connection.ssl !== false) {
        throw new SystemError('Migration export does not support database.connection.ssl. ' +
            'Use a separately verified TLS-aware migration procedure for this source; do not disable TLS to bypass this check.');
    }
}

/**
 * Which form the instance's data can travel in.
 *
 * - `mysql-dump`: a lossless `mysqldump` of the source database
 * - `portable`: Ghost's JSON content export + members CSV, taken over the admin API
 *
 * SQLite installs have to use `portable` - Ghost 7 drops sqlite3 support, so the
 * data has to arrive in a form that can land in MySQL.
 *
 * @param {import('../../instance.js')} instance
 * @return {'mysql-dump'|'portable'}
 */
function databaseKind(instance) {
    const client = instance.config.get('database.client');
    if (MYSQL_CLIENTS.includes(client)) {
        validateConnection(instance.config.get('database.connection', {}));
        return 'mysql-dump';
    }

    if (client === 'sqlite3' && instance.isLocal) {
        return 'portable';
    }

    throw new SystemError(`Unsupported migration source: ${client || 'missing database.client'}. Use MySQL or a local SQLite development install.`);
}

/**
 * Builds the mysqldump arguments for a Ghost database connection config
 *
 * @param {object} connection `database.connection` from the instance config
 * @return {Array<string>}
 */
function dumpArgs(connection) {
    validateConnection(connection);
    // `--single-transaction` keeps the dump consistent without locking the source
    const args = ['--no-tablespaces', '--single-transaction'];

    if (connection.socketPath) {
        args.push(`--socket=${connection.socketPath}`);
    } else {
        args.push(`--host=${connection.host || 'localhost'}`);

        if (connection.port) {
            args.push(`--port=${connection.port}`);
        }
    }

    if (connection.user) {
        args.push(`--user=${connection.user}`);
    }

    args.push(connection.database);
    return args;
}

/**
 * Dumps the instance's MySQL database to `outputFile`
 *
 * @param {import('../../instance.js')} instance
 * @param {string} outputFile
 * @return {Promise<void>}
 */
async function dumpDatabase(instance, outputFile) {
    const which = require('which');
    const connection = instance.config.get('database.connection', {});

    if (!connection.database) {
        throw new SystemError('No database name found in the instance config');
    }

    // Validate before probing tools or spawning a dump, including direct callers.
    const args = dumpArgs(connection);

    try {
        await which('mysqldump');
    } catch {
        throw new SystemError('mysqldump is required to export a MySQL install, but it isn\'t installed');
    }

    try {
        // The password goes via MYSQL_PWD so it never shows up in the process list
        await execa('mysqldump', args, {
            env: {MYSQL_PWD: connection.password || ''},
            stdout: {file: outputFile}
        });
    } catch (error) {
        throw new ProcessError(error);
    }
}

module.exports = {databaseKind, dumpArgs, dumpDatabase, MYSQL_CLIENTS};
