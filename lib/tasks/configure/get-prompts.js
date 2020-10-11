const path = require('path');
const {validate: validateUrl, ensureProtocol} = require('../../utils/url');

/**
 * Gets inquirer prompts based on passed argv and current config values
 *
 * @param {Config} config Config instane
 * @param {Object} argv Argv options
 */
module.exports = function getPrompts(config, argv, environment) {
    const prompts = [];

    if (!argv.url) {
        // Url command line option has not been supplied, add url config to prompts
        prompts.push({
            type: 'input',
            name: 'url',
            message: 'Enter your blog URL:',
            default: argv.auto ? null : config.get('url', 'http://localhost:2368'),
            validate: validateUrl,
            filter: ensureProtocol
        });
    }

    const db = argv.db || config.get('database.client');

    if (!db || db !== 'sqlite3') {
        if (!argv.dbhost) {
            prompts.push({
                type: 'input',
                name: 'dbhost',
                message: 'Enter your MySQL hostname:',
                default: config.get('database.connection.host', 'localhost')
            });
        }

        if (!argv.dbuser) {
            prompts.push({
                type: 'input',
                name: 'dbuser',
                message: 'Enter your MySQL username:',
                default: config.get('database.connection.user'),
                validate: val => Boolean(val) || 'You must supply a MySQL username.'
            });
        }

        if (!argv.dbpass) {
            prompts.push({
                type: 'password',
                name: 'dbpass',
                message: 'Enter your MySQL password' +
                    `${config.has('database.connection.password') ? ' (skip to keep current password)' : ''}:`,
                default: config.get('database.connection.password')
            });
        }

        if (!argv.dbname) {
            const sanitizedDirName = path.basename(process.cwd()).replace(/[^a-zA-Z0-9_]+/g, '_');
            const shortenedEnv = environment === 'development' ? 'dev' : 'prod';
            prompts.push({
                type: 'input',
                name: 'dbname',
                message: 'Enter your Ghost database name:',
                default: config.get('database.connection.database', `${sanitizedDirName}_${shortenedEnv}`),
                validate: val => !/[^a-zA-Z0-9_]/.test(val) || 'MySQL database names may consist of only alphanumeric characters and underscores.'
            });
        }
    }

    return prompts;
};
