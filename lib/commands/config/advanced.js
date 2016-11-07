// Advanced options for the config command
var validator = require('validator');

module.exports = [{
    name: 'ip',
    description: 'IP ghost should listen on'
}, {
    name: 'url',
    description: 'Blog url protocol required ex http://loveghost.com ',
    validate: function (value) {
        return validator.isURL(value, {
            require_protocol: true
        });
    }
}, {
    name: 'port',
    description: 'Port ghost should listen on'
}, {
    name: 'db',
    description: 'Type of database Ghost should use',
    validate: function validate(value) {
        var includes = require('lodash/includes');
        return includes(['sqlite3', 'mysql'], value);
    },
    configPath: 'database.client'
}, {
    name: 'dbpath',
    description: 'Path to the database file (sqlite3 only)',
    configPath: 'database.connection.filename'
}, {
    name: 'dbhost',
    description: 'Database host',
    configPath: 'database.connection.host'
}, {
    name: 'dbuser',
    description: 'Database username',
    configPath: 'database.connection.user'
}, {
    name: 'dbpass',
    description: 'Database password',
    configPath: 'database.connection.password'
}, {
    name: 'dbname',
    description: 'Database name',
    configPath: 'database.connection.database'
}];
