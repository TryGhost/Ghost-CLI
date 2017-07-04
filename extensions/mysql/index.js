'use strict';

const Promise = require('bluebird');
const mysql = require('mysql');
const crypto = require('crypto');
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
	let self = this;
	this.databaseConfig = ctx.instance.config.get('database');
	
	return this.canConnect()
	    .then(function() {		
		if (self.databaseConfig.connection.user === 'root') {
		    return self.ui.confirm('Your MySQL user is root. Would you like to create a `ghost` MySQL user?', true)
			.then(function(res) {
			    if (res.yes) {
				return self.createMySQLUser(ctx);
			    }
			});
		}

		self.ui.log('MySQL: Your user is: ' + self.databaseConfig.connection.user, 'green');
	    })
	    .finally(function() {
		self.connection.end();
	    });
    }   

    canConnect() {
	let self = this;
	this.connection = mysql.createConnection(omit(self.databaseConfig.connection, 'database'));

	return new Promise(function(resolve, reject) {
	    self.connection.connect(function(err) {
		if (err) {
		    self.ui.log('MySQL: connection error.', 'yellow');
		    return reject(new cli.errors.SystemError(err.message));
		}

		self.ui.log('MySQL: connection successful.', 'green');
		resolve();
	    });
	});
    }

    createMySQLUser(ctx) {
	let self = this;
	let randomPassword = crypto.randomBytes(10).toString('hex');
	let host = self.databaseConfig.connection.host;
	
	return new Promise(function(resolve, reject) {
	    self.connection.query('CREATE USER \'ghost\'@\'' + host + '\' IDENTIFIED BY \'' + randomPassword + '\';', function(err) {
		if (err) {
		    // CASE: user exists, we are not able to figure out the original password, skip mysql setup
		    if (err.errno === 1396) {
			self.ui.log('MySQL: `ghost` user exists. Skipping.', 'yellow');
			return resolve();
		    }

		    self.ui.log('MySQL: unable to create `ghost` user.', 'yellow');
		    return reject(new cli.errors.SystemError(err.message));
		}

		self.ui.log('MySQL: successfully created `ghost` user.', 'green');

		self.grantPermissions()
		    .then(function() {
			ctx.instance.config.set('database.connection.user', 'ghost');
			ctx.instance.config.set('database.connection.password', randomPassword);
			resolve();
		    })
		    .catch(reject);
	    });	    
	});
    }

    grantPermissions() {
	let self = this;
	let host = self.databaseConfig.connection.host;
	let database = self.databaseConfig.connection.database;
	
	return new Promise(function(resolve, reject) {
	    self.connection.query('GRANT ALL PRIVILEGES ON ' + database + '.* TO \'ghost\'@\'' + host + '\';', function(err) {
		if (err) {
		    self.ui.log('MySQL: unable to grant permissions for `ghost` user.', 'yellow');
		    return reject(new cli.errors.SystemError(err.message));		    
		}

		self.ui.log('MySQL: successfully granted permissions for `ghost` user.', 'green');

		self.connection.query('FLUSH PRIVILEGES;', function(err) {
		    if (err) {
			self.ui.log('MySQL: unable to flush privileges.', 'yellow');
			return reject(new cli.errors.SystemError(err.message));		    
		    }

		    self.ui.log('MySQL: flushed privileges', 'green');

		    resolve();
		});		    
	    });	    
	});	
    }

    updateGhostConfig() {
	
    }
}

module.exports = MySQLExtension;
