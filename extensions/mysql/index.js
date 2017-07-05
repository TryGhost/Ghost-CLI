'use strict';

const Promise = require('bluebird');
const mysql = require('mysql');
const crypto = require('crypto');
const omit = require('lodash/omit');
const cli = require('../../lib');

class MySQLExtension extends cli.Extension {
    _query(queryString) {
	return Promise.fromCallback(cb => this.connection.query(queryString, cb));
    }
    
    setup(cmd, argv) {
        // ghost setup --local, skip
        if (argv.local) {
            return;
        }

        cmd.addStage('mysql', this.setupMySQL.bind(this));
    }

    setupMySQL(argv, ctx, task) {
        this.databaseConfig = ctx.instance.config.get('database');

        return this.canConnect()
            .then(() => {
                if (this.databaseConfig.connection.user === 'root') {
                    return this.ui.confirm('Your MySQL user is root. Would you like to create a custom Ghost MySQL user?', true)
                        .then((res) => {
                            if (res.yes) {
                                return this.createMySQLUser(ctx);
                            }
                        });
                }

                self.ui.log('MySQL: Your user is: ' + this.databaseConfig.connection.user, 'green');
            })
            .finally(() => {
                this.connection.end();
            });
    }

    canConnect() {
        this.connection = mysql.createConnection(omit(this.databaseConfig.connection, 'database'));

	return Promise.fromCallback(cb => this.connection.connect(cb))
	    .then(() => {
                this.ui.log('MySQL: connection successful.', 'green');
	    })
	    .catch((err) => {
                this.ui.log('MySQL: connection error.', 'yellow');
                throw new cli.errors.SystemError({
		    message: err.message,
		    context: 'Either MySQL is not installed or the entered MySQL host ' + this.databaseConfig.connection.host + ':' + (this.databaseConfig.connection.port || '3306')  + ' is unreachable.',
		    help: 'Please run `ghost config` and then `ghost setup mysql` again.'
		});
	    });
    }

    createMySQLUser(ctx) {
        let randomPassword = crypto.randomBytes(10).toString('hex');
        let host = self.databaseConfig.connection.host;
	let username = 'ghost-';

	return this._query('CREATE USER \'ghost\'@\'' + host + '\' IDENTIFIED BY \'' + randomPassword + '\';')
	    .then(() => {
		this.ui.log('MySQL: successfully created `ghost` user.', 'green');
		
                return this.grantPermissions()
                    .then(() => {
                        ctx.instance.config.set('database.connection.user', 'ghost');
                        ctx.instance.config.set('database.connection.password', randomPassword);
                    });
	    })
	    .catch((err) => {
		// CASE: user exists, we are not able to figure out the original password, skip mysql setup
                if (err.errno === 1396) {
                    this.ui.log('MySQL: `ghost` user exists. Skipping.', 'yellow');
                    return Promise.resolve();
                }
		
                this.ui.log('MySQL: unable to create `ghost` user.', 'yellow');
                throw new cli.errors.SystemError(err.message);
	    });
    }

    grantPermissions() {
        let host = self.databaseConfig.connection.host;
        let database = self.databaseConfig.connection.database;

	return this._query('GRANT ALL PRIVILEGES ON ' + database + '.* TO \'ghost\'@\'' + host + '\';')
	    .then(() => {		
                this.ui.log('MySQL: successfully granted permissions for `ghost` user.', 'green');

                return this._query('FLUSH PRIVILEGES;')
		    .then(() => {
			this.ui.log('MySQL: flushed privileges', 'green');
		    })
		    .catch((err) => {
			this.ui.log('MySQL: unable to flush privileges.', 'yellow');
                        throw new cli.errors.SystemError(err.message);
		    });
	    })
	    .catch((err) => {
		this.ui.log('MySQL: unable to grant permissions for `ghost` user.', 'yellow');
                throw new cli.errors.SystemError(err.message);
	    });
    }
}

module.exports = MySQLExtension;
