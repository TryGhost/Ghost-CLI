'use strict';
// Advanced options for the config command
const portfinder = require('portfinder');
const toString = require('lodash/toString');
const includes = require('lodash/includes');
const validator = require('validator');
const url = require('url');

const BASE_PORT = '2368';
const knownMailServices = [
    'AOL', 'DynectEmail', 'Gmail', 'hot.ee', 'Hotmail', 'iCloud', 'mail.ee', 'Mail.Ru', 'Mailgun',
    'Mailjet', 'Mandrill', 'Postmark', 'QQ', 'QQex (Tencent Business Email)', 'SendGrid',
    'SendCloud', 'SES', 'Yahoo', 'yandex', 'Zoho'
];

/*
    Note: these options are handled serially, i.e. one after the other.
    The `default` function in each option is passed the current config. Because the
    options are handled serially, each default function can be certain that that previous
    options will have been handled prior to it being run.
 */
module.exports = {
    ip: {
        description: 'IP ghost should listen on',
        configPath: 'server.host',
        type: 'string'
    },
    url: {
        description: 'Blog url protocol required ex http://loveghost.com ',
        validate: value => validator.isURL(value, {require_protocol: true}) ||
            'Invalid URL. Your URL should include a protocol, E.g. http://my-ghost-blog.com',
        type: 'string'
    },
    adminUrl: {
        description: 'Url for the admin client, if different than the normal url',
        configPath: 'admin.url',
        validate: value => validator.isURL(value, {require_protocol: true}) ||
            'Invalid URL. Your URL should include a protocol, E.g. http://my-ghost-blog.com',
        type: 'string'
    },
    port: {
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
        defaultValue: config => {
            let port = url.parse(config.get('url')).port || BASE_PORT;
            return portfinder.getPortPromise({port: parseInt(port)});
        },
        type: 'number'
    },
    process: {
        description: 'Type of process manager to run Ghost with',
        defaultValue: (c, env) => env === 'production' ? 'systemd' : 'local',
        type: 'string'
    },

    // Database options
    db: {
        description: 'Type of database Ghost should use',
        validate: value => includes(['sqlite3', 'mysql'], value),
        configPath: 'database.client',
        type: 'string'
    },
    dbpath: {
        description: 'Path to the database file (sqlite3 only)',
        configPath: 'database.connection.filename',
        type: 'string'
    },
    dbhost: {
        description: 'Database host',
        configPath: 'database.connection.host',
        type: 'string'
    },
    dbuser: {
        description: 'Database username',
        configPath: 'database.connection.user',
        type: 'string'
    },
    dbpass: {
        description: 'Database password',
        configPath: 'database.connection.password',
        type: 'string'
    },
    dbname: {
        description: 'Database name',
        configPath: 'database.connection.database',
        type: 'string'
    },

    // Mail options:
    // Designed to support the most common mail configs, more advanced configs will require editing the config file
    mail: {
        description: 'Mail transport, E.g SMTP, Sendmail or Direct',
        validate: value => includes(['SMTP', 'Sendmail', 'Direct'], value),
        configPath: 'mail.transport',
        type: 'string',
        default: 'Direct'
    },
    mailservice: {
        description: 'Mail service (used with SMTP transport), E.g. Mailgun, Sendgrid, Gmail, SES...',
        configPath: 'mail.options.service',
        validate: value => includes(knownMailServices, value),
        type: 'string'
    },
    mailuser: {
        description: 'Mail auth user (used with SMTP transport)',
        configPath: 'mail.options.auth.user',
        type: 'string',
        implies: 'mailpass'
    },
    mailpass: {
        description: 'Mail auth pass (used with SMTP transport)',
        configPath: 'mail.options.auth.pass',
        type: 'string',
        implies: 'mailuser'
    },
    mailhost: {
        description: 'Mail host (used with SMTP transport)',
        configPath: 'mail.options.host',
        type: 'string'
    },
    mailport: {
        description: 'Mail port (used with SMTP transport)',
        configPath: 'mail.options.port',
        type: 'number'
    },

    sslemail: {
        description: 'SSL email address',
        configPath: 'ssl.email',
        type: 'string'
    },
    log: {
        description: 'Transport to send Ghost log output to',
        configPath: 'logging.transports',
        filter: (value, transports) => {
            transports.push(value);
            return transports;
        },
        default: ['file', 'stdout'], // used for config command handling
        type: 'array'
    }
};
