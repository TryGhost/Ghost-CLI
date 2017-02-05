'use strict';
// Advanced options for the config command
const includes = require('lodash/includes');
const validator = require('validator');
const url = require('url');

module.exports = [{
    name: 'ip',
    description: 'IP ghost should listen on'
}, {
    name: 'url',
    description: 'Blog url protocol required ex http://loveghost.com ',
    validate: value => validator.isURL(value, {require_protocol: true})
}, {
    name: 'pname',
    description: 'Name of the Ghost instance',
    validate: value => !!value.match(/[A-Za-z0-9:\.\-_]+/),
    default: config => url.parse(config.get('url')).hostname
}, {
    name: 'port',
    description: 'Port ghost should listen on'
}, {
    name: 'process',
    description: 'Type of process manager to run Ghost with'
}, {
    name: 'db',
    description: 'Type of database Ghost should use',
    validate: value => includes(['sqlite3', 'mysql'], value),
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
