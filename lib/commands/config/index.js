'use strict';
const url = require('url');

const Command = require('../../command');
const advancedOptions = require('./advanced');

class ConfigCommand extends Command {
    static configureSubcommands(commandName, commandArgs, extensions) {
        return commandArgs.command({
            command: 'get <key>',
            describe: 'Get a specific value from the configuration file',
            handler: argv => this._run(`${commandName} get`, argv, extensions)
        }).command({
            command: 'set <key> <value>',
            describe: 'Set a specific value in the configuration file',
            handler: argv => this._run(`${commandName} set`, argv, extensions)
        });
    }

    constructor(ui, system) {
        super(ui, system);

        this.instance = this.system.getInstance();
    }

    handleAdvancedOptions(argv = {}) {
        const errors = require('../../errors');
        const Promise = require('bluebird');
        const isFunction = require('lodash/isFunction');

        return Promise.each(Object.keys(advancedOptions), (key) => {
            const option = advancedOptions[key];
            let value = argv[key];
            const configKey = option.configPath || key;

            if (!value || !value.toString().length) {
                if (!option.defaultValue) {
                    return Promise.resolve();
                }

                const defaultValue = isFunction(option.defaultValue) ?
                    option.defaultValue(this.instance.config, this.system.environment) :
                    option.defaultValue;

                return Promise.resolve(defaultValue).then((result) => {
                    this.instance.config.set(configKey, result);
                });
            }

            if (value && option.transform) {
                value = option.transform(value);
            }

            return Promise.resolve(option.validate ? option.validate(value) : true).then((validated) => {
                if (validated !== true) {
                    return Promise.reject(new errors.ConfigError({
                        config: {
                            [configKey]: value
                        },
                        message: validated,
                        environment: this.environment
                    }));
                }

                this.instance.config.set(configKey, value);
            });
        }).then(() => {
            this.syncUrl(argv);
            this.instance.config.save();
        });
    }

    syncUrl(argv) {
        if (argv.url && argv.port) {
            // If we have supplied both url and port options via args, we
            // don't want to override anything so just return
            return;
        }

        // Because the 'port' option can end up being different than the one supplied
        // in the URL itself, we want to make sure the port in the URL
        // (if one was there to begin with) is correct.
        const parsedUrl = url.parse(this.instance.config.get('url'));
        if (parsedUrl.port && parsedUrl.port !== this.instance.config.get('server.port', parsedUrl.port)) {
            parsedUrl.port = this.instance.config.get('server.port');
            // url.format won't take the new port unless 'parsedUrl.host' is undefined
            delete parsedUrl.host;

            this.instance.config.set('url', url.format(parsedUrl));
        }
    }

    getConfigPrompts(argv) {
        const urlUtils = require('../../utils/url');
        const path = require('path');

        const prompts = [];

        if (!argv.url) {
            // Url command line option has not been supplied, add url config to prompts
            prompts.push({
                type: 'input',
                name: 'url',
                message: 'Enter your domain:',
                default: argv.auto ? null : this.instance.config.get('url', 'http://localhost:2368'),
                validate: urlUtils.validate,
                filter: urlUtils.ensureProtocol
            });
        }

        const db = argv.db || this.instance.config.get('database.client');

        if (!db || db !== 'sqlite3') {
            if (!argv.dbhost) {
                prompts.push({
                    type: 'input',
                    name: 'dbhost',
                    message: 'Enter your MySQL hostname:',
                    default: this.instance.config.get('database.connection.host', 'localhost')
                });
            }

            if (!argv.dbuser) {
                prompts.push({
                    type: 'input',
                    name: 'dbuser',
                    message: 'Enter your MySQL username:',
                    default: this.instance.config.get('database.connection.user'),
                    validate: val => Boolean(val) || 'You must supply a MySQL username.'
                });
            }

            if (!argv.dbpass) {
                prompts.push({
                    type: 'password',
                    name: 'dbpass',
                    message: 'Enter your MySQL password' +
                        `${this.instance.config.has('database.connection.password') ? ' (skip to keep current password)' : ''}:`,
                    default: this.instance.config.get('database.connection.password')
                });
            }

            if (!argv.dbname) {
                const sanitizedDirName = path.basename(process.cwd()).replace(/[^a-zA-Z0-9_]+/g, '_');
                const shortenedEnv = this.system.development ? 'dev' : 'prod';
                prompts.push({
                    type: 'input',
                    name: 'dbname',
                    message: 'Enter your database name:',
                    default: this.instance.config.get('database.connection.database', `${sanitizedDirName}_${shortenedEnv}`),
                    validate: val => !/[^a-zA-Z0-9_]/.test(val) || 'MySQL database names may consist of only alphanumeric characters and underscores.'
                });
            }
        }

        return prompts;
    }

    run(argv) {
        const key = argv.key;
        let value = argv.value;

        if (key || !argv.ignoreEnvCheck) {
            this.instance.checkEnvironment();
        }

        if (key && !value) {
            // getter
            value = this.instance.config.get(key, null);

            if (value) {
                this.ui.log(value);
            }

            return Promise.resolve();
        } else if (key) {
            // setter
            this.instance.config.set(key, value).save();
            this.ui.log(`Successfully set '${key}' to '${value}'`, 'green');
            return Promise.resolve();
        }

        const prompts = this.getConfigPrompts(argv);

        if (!argv.prompt || !prompts.length) {
            return this.handleAdvancedOptions(argv);
        }

        return this.ui.prompt(prompts).then((values) => {
            // basic check if we prompted for mysql data
            if (values.dbhost) {
                argv.db = 'mysql';
            }

            Object.keys(values).forEach((key) => {
                if (values[key]) {
                    argv[key] = values[key];
                }
            });

            return this.handleAdvancedOptions(argv);
        });
    }
}

ConfigCommand.description = 'Configure a Ghost instance';
ConfigCommand.longDescription = '$0 config [key] [value]\n View or modify the configuration for a Ghost instance.';
ConfigCommand.params = '[key] [value]';
ConfigCommand.options = advancedOptions;

module.exports = ConfigCommand;
