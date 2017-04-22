'use strict';
// Advanced options for the config command
const portfinder = require('portfinder');
const toString = require('lodash/toString');
const includes = require('lodash/includes');
const validator = require('validator');
const url = require('url');

const BASE_PORT = '2368';

/*
    Note: these options are handled serially, i.e. one after the other.
    The `default` function in each option is passed the current config. Because the
    options are handled serially, each default function can be certain that that previous
    options will have been handled prior to it being run.
 */
module.exports = [{
    name: 'ip',
    description: 'IP ghost should listen on'
}, {
    name: 'url',
    description: 'Blog url protocol required ex http://loveghost.com ',
    validate: value => validator.isURL(value, {require_protocol: true}) ||
        'Invalid URL. Your URL should include a protocol, E.g. http://my-ghost-blog.com'
}, {
    name: 'adminUrl',
    description: 'Url for the admin client, if different than the normal url',
    configPath: 'admin.url',
    validate: value => validator.isURL(value, {require_protocol: true}) ||
        'Invalid URL. Your URL should include a protocol, E.g. http://my-ghost-blog.com'
}, {
    name: 'pname',
    description: 'Name of the Ghost instance',
    validate: value => !!value.match(/[A-Za-z0-9:\.\-_]+/) ||
        'Invalid process name. Process name can contain alphanumeric characters,' +
        'and the special characters \'.\', \'-\', and \'_\'',
    default: config => url.parse(config.get('url')).hostname
}, {
    name: 'port',
    description: 'Port ghost should listen on',
    configPath: 'server.port',
    validate: value => {
        value = toString(value);

        if (!validator.isInt(value, {allow_leading_zeros: false})) {
            return 'Port must be an integer.';
        }

        return portfinder.getPortPromise({port: value}).then((port) => {
            return (port === value) || `Port '${value}' is in use.`;
        });
    },
    default: config => {
        let port = url.parse(config.get('url')).port || BASE_PORT;
        return portfinder.getPortPromise({port: parseInt(port)});
    }
}, {
    name: 'process',
    description: 'Type of process manager to run Ghost with',
    default: config => config.environment === 'production' ? 'systemd' : 'local'
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
}, {
    name: 'sslemail',
    description: 'SSL email address',
    configPath: 'ssl.email'
}, {
    name: 'auth',
    description: 'Type of authentication to use',
    configPath: 'auth.type',
    validate: value => value === 'password'
}, {
    name: 'log',
    description: 'Transport to send Ghost log output to',
    configPath: 'logging.transports',
    filter: (value, transports) => {
        transports.push(value);
        return transports;
    },
    defaultValue: [], // used for commander.js config
    default: ['file', 'stdout'] // used for config command handling
}];
