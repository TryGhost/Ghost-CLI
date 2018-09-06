'use strict';
// Advanced options for the config command
const portfinder = require('portfinder');
const toString = require('lodash/toString');
const validator = require('validator');
const urlUtils = require('../../utils/url');
const url = require('url');

const BASE_PORT = 2368;
const knownMailServices = [
    'aol', 'dynectemail', 'fastmail', 'gmail', 'godaddy', 'godaddyasia', 'godaddyeurope', 'hot.ee', 'hotmail', 'icloud',
    'mail.ee', 'mail.ru', 'mailgun', 'mailjet', 'mandrill', 'postmark', 'qq', 'qqex', 'sendgrid',
    'sendcloud', 'ses', 'yahoo', 'yandex', 'zoho'
];

/*
    Note: these options are handled serially, i.e. one after the other.
    The `default` function in each option is passed the current config. Because the
    options are handled serially, each default function can be certain that that previous
    options will have been handled prior to it being run.
 */
module.exports = {
    url: {
        description: 'Site domain E.g. loveghost.com',
        validate: urlUtils.validate,
        transform: urlUtils.ensureProtocol,
        type: 'string',
        group: 'Ghost Options:'
    },
    adminUrl: {
        description: 'Admin client domain, if different to the site domain',
        configPath: 'admin.url',
        validate: urlUtils.validate,
        transform: urlUtils.ensureProtocol,
        type: 'string',
        group: 'Ghost Options:'
    },
    port: {
        description: 'Port to listen on',
        configPath: 'server.port',
        validate: (value) => {
            value = toString(value);

            if (!validator.isInt(value, {allow_leading_zeros: false})) {
                return 'Port must be an integer.';
            }

            return portfinder.getPortPromise({port: parseInt(value)})
                .then(port => (parseInt(port) === parseInt(value)) || `Port '${value}' is in use.`);
        },
        defaultValue: (config) => {
            const port = parseInt(url.parse(config.get('url')).port || BASE_PORT);
            return portfinder.getPortPromise({port: port});
        },
        type: 'number',
        group: 'Ghost Options:'
    },
    ip: {
        description: 'IP to listen on',
        configPath: 'server.host',
        default: '127.0.0.1',
        type: 'string',
        group: 'Ghost Options:'
    },

    // Database options
    db: {
        description: 'Type of database to use E.g. mysql or sqlite3',
        validate: value => ['sqlite3', 'mysql'].includes(value) ||
            'Invalid database type. Supported types are mysql and sqlite3',
        configPath: 'database.client',
        type: 'string',
        group: 'Database Options:'
    },
    dbpath: {
        description: 'Path to the database file (sqlite3 only)',
        configPath: 'database.connection.filename',
        type: 'string',
        group: 'Database Options:',
        defaultValue: (config, environment) => {
            if (config.get('database.client') !== 'sqlite3') {
                return null;
            }

            const dbFile = (environment === 'production') ? 'ghost.db' : 'ghost-dev.db';
            return `./content/data/${dbFile}`;
        }
    },
    dbhost: {
        description: 'Database host',
        configPath: 'database.connection.host',
        type: 'string',
        group: 'Database Options:'
    },
    dbuser: {
        description: 'Database username',
        configPath: 'database.connection.user',
        type: 'string',
        group: 'Database Options:'
    },
    dbpass: {
        description: 'Database password',
        configPath: 'database.connection.password',
        type: 'string',
        group: 'Database Options:'
    },
    dbname: {
        description: 'Database name',
        configPath: 'database.connection.database',
        type: 'string',
        group: 'Database Options:'
    },

    // Mail options:
    // Designed to support the most common mail configs, more advanced configs will require editing the config file
    mail: {
        description: 'Mail transport, E.g SMTP, Sendmail or Direct',
        validate: value => ['smtp', 'sendmail', 'direct', 'ses'].includes(value.toLowerCase()) || 'Invalid mail transport',
        configPath: 'mail.transport',
        type: 'string',
        default: 'Direct',
        group: 'Mail Options:'
    },
    mailservice: {
        description: 'Mail service (used with SMTP transport), E.g. Mailgun, Sendgrid, Gmail, SES...',
        configPath: 'mail.options.service',
        validate: value => knownMailServices.includes(value.toLowerCase()) || 'Invalid mail service',
        type: 'string',
        group: 'Mail Options:'
    },
    mailuser: {
        description: 'Mail auth user (used with SMTP transport)',
        configPath: 'mail.options.auth.user',
        type: 'string',
        implies: 'mailpass',
        group: 'Mail Options:'
    },
    mailpass: {
        description: 'Mail auth pass (used with SMTP transport)',
        configPath: 'mail.options.auth.pass',
        type: 'string',
        implies: 'mailuser',
        group: 'Mail Options:'
    },
    mailhost: {
        description: 'Mail host (used with SMTP transport)',
        configPath: 'mail.options.host',
        type: 'string',
        group: 'Mail Options:'
    },
    mailport: {
        description: 'Mail port (used with SMTP transport)',
        configPath: 'mail.options.port',
        type: 'number',
        group: 'Mail Options:'
    },

    // Log options
    log: {
        description: 'Transport to send log output to',
        configPath: 'logging.transports',
        default: ['file', 'stdout'], // used for config command handling
        type: 'array',
        group: 'Ghost Options:'
    },

    // Customise how Ghost-CLI runs
    process: {
        description: 'Process manager to run with',
        // eslint-disable-next-line arrow-body-style
        defaultValue: (c, env) => {
            return env === 'production' ? 'systemd' : 'local';
        },
        type: 'string',
        group: 'Service Options:'
    }
};
