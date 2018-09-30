'use strict';

const Promise = require('bluebird');
const mysql = require('mysql');
const omit = require('lodash/omit');
const generator = require('generate-password');
const {Extension, errors} = require('../../lib');

const localhostAliases = ['localhost', '127.0.0.1'];
const {ConfigError, CliError} = errors;

class MySQLExtension extends Extension {
    setup() {
        return [{
            id: 'mysql',
            name: '"ghost" mysql user',
            task: (...args) => this.setupMySQL(...args),
            // Case 1: ghost install local OR ghost setup --local
            // Case 2: ghost install --db sqlite3
            // Skip in both cases
            enabled: ({argv}) => !(argv.local || argv.db === 'sqlite3'),
            skip: ({instance}) => instance.config.get('database.connection.user') !== 'root'
        }];
    }

    setupMySQL(ctx) {
        const dbconfig = ctx.instance.config.get('database.connection');

        return this.ui.listr([{
            title: 'Connecting to database',
            task: () => this.canConnect(ctx, dbconfig)
        }, {
            title: 'Creating new MySQL user',
            task: () => this.createUser(ctx, dbconfig)
        }, {
            title: 'Granting new user permissions',
            task: () => this.grantPermissions(ctx, dbconfig)
        }, {
            title: 'Saving new config',
            task: () => {
                ctx.instance.config.set('database.connection.user', ctx.mysql.username)
                    .set('database.connection.password', ctx.mysql.password).save();

                this.connection.end();
            }
        }], false);
    }

    canConnect(ctx, dbconfig) {
        this.connection = mysql.createConnection(omit(dbconfig, 'database'));

        return Promise.fromCallback(cb => this.connection.connect(cb)).catch((error) => {
            if (error.code === 'ECONNREFUSED') {
                return Promise.reject(new ConfigError({
                    message: error.message,
                    config: {
                        'database.connection.host': dbconfig.host,
                        'database.connection.port': dbconfig.port || '3306'
                    },
                    environment: this.system.environment,
                    help: 'Ensure that MySQL is installed and reachable. You can always re-run `ghost setup` to try again.'
                }));
            } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
                return Promise.reject(new ConfigError({
                    message: error.message,
                    config: {
                        'database.connection.user': dbconfig.user,
                        'database.connection.password': dbconfig.password
                    },
                    environment: this.system.environment,
                    help: 'You can run `ghost config` to re-enter the correct credentials. Alternatively you can run `ghost setup` again.'
                }));
            }

            return Promise.reject(new CliError({
                message: 'Error trying to connect to the MySQL database.',
                help: 'You can run `ghost config` to re-enter the correct credentials. Alternatively you can run `ghost setup` again.',
                err: error
            }));
        });
    }

    createUser(ctx, dbconfig) {
        const randomPassword = generator.generate({
            length: 20,
            numbers: true,
            symbols: true,
            strict: true
        });

        // This will be the "allowed connections from" host of the mysql user.
        // If the db connection host is something _other_ than localhost (e.g. a remote db connection)
        // we want the host to be `%` rather than the db host.
        const host = !localhostAliases.includes(dbconfig.host) ? '%' : dbconfig.host;

        let username;

        // Ensure old passwords is set to 0
        return this._query('SET old_passwords = 0;').then(() => {
            this.ui.logVerbose('MySQL: successfully disabled old_password', 'green');

            return this._query(`SELECT PASSWORD('${randomPassword}') AS password;`);
        }).then((result) => {
            this.ui.logVerbose('MySQL: successfully created password hash.', 'green');

            const tryCreateUser = () => {
                // IMPORTANT: we generate random MySQL usernames
                // e.g. you delete all your Ghost instances from your droplet and start from scratch, the MySQL users would remain and the CLI has to generate a random user name to work
                // e.g. if we would rely on the instance name, the instance naming only auto increments if there are existing instances
                // the most important fact is, that if a MySQL user exists, we have no access to the password, which we need to autofill the Ghost config
                // disadvantage: the CLI could potentially create lot's of MySQL users (but this should only happen if the user installs Ghost over and over again with root credentials)
                username = `ghost-${Math.floor(Math.random() * 1000)}`;

                return this._query(
                    `CREATE USER '${username}'@'${host}' ` +
                    `IDENTIFIED WITH mysql_native_password AS '${result[0].password}';`
                ).catch((error) => {
                    // User already exists, run this method again
                    if (error.err && error.err.errno === 1396) {
                        this.ui.logVerbose('MySQL: user exists, re-trying user creation with new username', 'yellow');
                        return tryCreateUser();
                    }

                    error.message = `Creating new MySQL user errored with message: ${error.message}`;

                    return Promise.reject(error);
                });
            };

            return tryCreateUser();
        }).then(() => {
            this.ui.logVerbose(`MySQL: successfully created new user ${username}`, 'green');

            ctx.mysql = {
                host: host,
                username: username,
                password: randomPassword
            };
        }).catch((error) => {
            this.ui.logVerbose('MySQL: Unable to create custom Ghost user', 'red');
            this.connection.end(); // Ensure we end the connection

            error.message = `Creating new MySQL user errored with message: ${error.message}`;

            return Promise.reject(error);
        });
    }

    grantPermissions(ctx, dbconfig) {
        return this._query(`GRANT ALL PRIVILEGES ON ${dbconfig.database}.* TO '${ctx.mysql.username}'@'${ctx.mysql.host}';`).then(() => {
            this.ui.logVerbose(`MySQL: Successfully granted privileges for user "${ctx.mysql.username}"`, 'green');
            return this._query('FLUSH PRIVILEGES;');
        }).then(() => {
            this.ui.logVerbose('MySQL: flushed privileges', 'green');
        }).catch((error) => {
            this.ui.logVerbose('MySQL: Unable either to grant permissions or flush privileges', 'red');
            this.connection.end();

            error.message = `Granting database permissions errored with message: ${error.message}`;

            return Promise.reject(error);
        });
    }

    _query(queryString) {
        this.ui.logVerbose(`MySQL: running query > ${queryString}`, 'gray');
        return Promise.fromCallback(cb => this.connection.query(queryString, cb))
            .catch((error) => {
                if (error instanceof CliError) {
                    return Promise.reject(error);
                }

                return Promise.reject(new CliError({
                    message: error.message,
                    context: queryString,
                    err: error
                }));
            });
    }
}

module.exports = MySQLExtension;
