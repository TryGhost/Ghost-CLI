'use strict';

const Promise = require('bluebird');
const mysql = require('mysql');
const omit = require('lodash/omit');
const cli = require('../../lib');

class MySQLExtension extends cli.Extension {
    setup(cmd, argv) {
	// ghost setup --local, skip
	if (argv.local) {
	    return;
	}

	cmd.addStage('mysql', this.setupMySQL.bind(this));
    }

    setupMySQL(argv, ctx, task) {
	let databaseConfig = ctx.instance.config.get('database');
	let self = this;
	
	return this.canConnect(databaseConfig)
	    .then(function() {
		if (databaseConfig.connection.user === 'root') {
		    return self.ui.confirm('Your MySQL user is root. Would you like to create a `ghost` MySQL user?', true)
			.then(function(res) {
			    if (res.yes) {
				return self.createMySQLUser();
			    }
			});
		}		
	    });
    }   

    canConnect(databaseConfig) {
	let connection = mysql.createConnection(omit(databaseConfig.connection, 'database'));
	let self = this;

	return new Promise(function(resolve, reject) {
	    connection.connect(function(err) {
		if (err) {
		    self.ui.log('MySQL connection error.', 'yellow');
		    return reject(new cli.errors.SystemError(err.message));
		}

		self.ui.log('MySQL connection successful.', 'green');
		connection.end();
		resolve();
	    });		
	});
    }

    createMySQLUser() {
	
    }
}

module.exports = MySQLExtension;
