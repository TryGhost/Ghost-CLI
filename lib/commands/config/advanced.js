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
    name: 'pname',
    description: 'Name of the Ghost instance',
    validate: function (value) {
        return value.match(/[A-Za-z0-9:\.\-_]+/);
    },
    default: function (config) {
        var url = require('url');

        return url.parse(config.get('url')).hostname;
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
