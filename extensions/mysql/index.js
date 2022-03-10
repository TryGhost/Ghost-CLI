const Promise = require('bluebird');
const mysql = require('mysql2');
const omit = require('lodash/omit');
const generator = require('generate-password');
const semver = require('semver');

const {Extension, errors} = require('../../lib');

const localhostAliases = ['localhost', '127.0.0.1'];
const {ConfigError, CliError, SystemError} = errors;

function isMySQL8(version) {
    return version && version.major === 8;
}

function isUnsupportedMySQL(version) {
    return version && semver.lt(version, '5.7.0');
}

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
            title: 'Setting up database (MySQL 8)',
            task: () => this.createMySQL8Database(dbconfig),
            enabled: ({mysql: mysqlCtx}) => mysqlCtx && isMySQL8(mysqlCtx.version)
        }, {
            title: 'Saving new config',
            task: () => {
                ctx.instance.config.set('database.connection.user', ctx.mysql.username)
                    .set('database.connection.password', ctx.mysql.password).save();

                this.connection.end();
            }
        }], false);
    }

    async isDeprecated(dbconfig) {
        const ctx = {};
        await this.canConnect(ctx, dbconfig);
        this.connection.end();

        // Anything that isn't MySQL 8 is deprecated
        return ctx.mysql && !isMySQL8(ctx.mysql.version);
    }

    async getServerVersion() {
        try {
            const result = await this._query('SELECT @@version AS version');
            if (result && result[0] && result[0].version) {
                return semver.parse(result[0].version, true);
            }

            return null;
        } catch (error) {
            this.ui.logVerbose('MySQL: failed to determine server version, assuming 5.x', 'gray');
            return null;
        }
    }

    async canConnect(ctx, dbconfig) {
        this.connection = mysql.createConnection(omit(dbconfig, 'database'));

        try {
            await Promise.fromCallback(cb => this.connection.connect(cb));
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                throw new ConfigError({
                    message: error.message,
                    config: {
                        'database.connection.host': dbconfig.host,
                        'database.connection.port': dbconfig.port || '3306'
                    },
                    environment: this.system.environment,
                    help: 'Ensure that MySQL is installed and reachable. You can always re-run `ghost setup` to try again.'
                });
            } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
                throw new ConfigError({
                    message: error.message,
                    config: {
                        'database.connection.user': dbconfig.user,
                        'database.connection.password': dbconfig.password
                    },
                    environment: this.system.environment,
                    help: 'You can run `ghost config` to re-enter the correct credentials. Alternatively you can run `ghost setup` again.'
                });
            }

            throw new CliError({
                message: 'Error trying to connect to the MySQL database.',
                help: 'You can run `ghost config` to re-enter the correct credentials. Alternatively you can run `ghost setup` again.',
                err: error
            });
        }

        const version = await this.getServerVersion();
        if (version) {
            if (isUnsupportedMySQL(version)) {
                throw new SystemError({
                    message: `Error: unsupported MySQL version (${version.raw})`,
                    help: 'Update your MySQL server to at least MySQL v5.7 in order to run Ghost'
                });
            }

            ctx.mysql = {version};
        }
    }

    randomUsername() {
        // IMPORTANT: we generate random MySQL usernames
        // e.g. you delete all your Ghost instances from your droplet and start from scratch, the MySQL users would remain and the CLI has to generate a random user name to work
        // e.g. if we would rely on the instance name, the instance naming only auto increments if there are existing instances
        // the most important fact is, that if a MySQL user exists, we have no access to the password, which we need to autofill the Ghost config
        // disadvantage: the CLI could potentially create lot's of MySQL users (but this should only happen if the user installs Ghost over and over again with root credentials)
        return `ghost-${Math.floor(Math.random() * 1000)}`;
    }

    async getMySQL5Password() {
        const randomPassword = generator.generate({
            length: 20,
            numbers: true,
            symbols: true,
            strict: true
        });

        await this._query('SET old_passwords = 0;');
        this.ui.logVerbose('MySQL: successfully disabled old_passwords', 'green');

        const result = await this._query(`SELECT PASSWORD('${randomPassword}') AS password;`);

        if (!result || !result[0] || !result[0].password) {
            throw new Error('MySQL password generation failed');
        }

        this.ui.logVerbose('MySQL: successfully created password hash.', 'green');
        return {
            password: randomPassword,
            hash: result[0].password
        };
    }

    async createMySQL5User(host) {
        const username = this.randomUsername();
        const {password, hash} = await this.getMySQL5Password();
        await this._query(`CREATE USER '${username}'@'${host}' IDENTIFIED WITH mysql_native_password AS '${hash}';`);
        this.ui.logVerbose(`MySQL: successfully created new user ${username}`, 'green');
        return {username, password};
    }

    async createMySQL8User(host) {
        const username = this.randomUsername();

        const result = await this._query(
            `CREATE USER '${username}'@'${host}' IDENTIFIED WITH mysql_native_password BY RANDOM PASSWORD`
        );

        if (!result || !result[0] || !result[0]['generated password']) {
            throw new Error('MySQL user creation did not return a generated password');
        }

        this.ui.logVerbose(`MySQL: successfully created new user ${username}`, 'green');

        return {
            username,
            password: result[0]['generated password']
        };
    }

    async createUser(ctx, dbconfig) {
        // This will be the "allowed connections from" host of the mysql user.
        // If the db connection host is something _other_ than localhost (e.g. a remote db connection)
        // we want the host to be `%` rather than the db host.
        const host = !localhostAliases.includes(dbconfig.host) ? '%' : dbconfig.host;
        const {version} = ctx.mysql || {};

        try {
            let user = {};

            if (isMySQL8(version)) {
                user = await this.createMySQL8User(host);
            } else {
                user = await this.createMySQL5User(host);
            }

            ctx.mysql = {
                ...(ctx.mysql || {}),
                ...user,
                host
            };
        } catch (error) {
            if (error.err && error.err.errno === 1396) {
                this.ui.logVerbose('MySQL: user exists, re-trying user creation with new username', 'yellow');
                return this.createUser(ctx, dbconfig);
            }

            this.ui.logVerbose('MySQL: Unable to create custom Ghost user', 'red');
            this.connection.end(); // Ensure we end the connection

            error.message = `Creating new MySQL user errored with message: ${error.message}`;
            throw error;
        }
    }

    async grantPermissions(ctx, dbconfig) {
        try {
            await this._query(`GRANT ALL PRIVILEGES ON \`${dbconfig.database}\`.* TO '${ctx.mysql.username}'@'${ctx.mysql.host}';`);
            this.ui.logVerbose(`MySQL: Successfully granted privileges for user "${ctx.mysql.username}"`, 'green');

            await this._query('FLUSH PRIVILEGES;');
            this.ui.logVerbose('MySQL: flushed privileges', 'green');
        } catch (error) {
            this.ui.logVerbose('MySQL: Unable either to grant permissions or flush privileges', 'red');
            this.connection.end();

            error.message = `Granting database permissions errored with message: ${error.message}`;
            throw error;
        }
    }

    async createMySQL8Database(dbconfig) {
        const {database} = dbconfig;
        if (!database) {
            return;
        }

        try {
            await this._query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;`);
            this.ui.logVerbose(`MySQL: created database ${database}`, 'green');
        } catch (error) {
            this.ui.logVerbose(`MySQL: failed to create database ${database}`, 'red');
            this.connection.end();

            error.message = `Creating database ${database} errored with message: ${error.message}`;
            throw error;
        }
    }

    async _query(queryString) {
        this.ui.logVerbose(`MySQL: running query > ${queryString}`, 'gray');
        try {
            const result = await Promise.fromCallback(cb => this.connection.query(queryString, cb));
            return result;
        } catch (error) {
            if (error instanceof CliError) {
                throw error;
            }

            throw new CliError({
                message: error.message,
                context: queryString,
                err: error
            });
        }
    }
}

module.exports = MySQLExtension;
