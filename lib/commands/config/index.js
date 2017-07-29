'use strict';
const url           = require('url');
const validator     = require('validator');
const isFunction    = require('lodash/isFunction');
const Promise       = require('bluebird');

const Command           = require('../../command');
const advancedOptions   = require('./advanced');
const errors            = require('../../errors');

class ConfigCommand extends Command {
    constructor(ui, system) {
        super(ui, system);

        this.instance = this.system.getInstance();
    }

    handleAdvancedOptions(argv) {
        return Promise.each(Object.keys(advancedOptions), (key) => {
            let option = advancedOptions[key];
            let value = argv[key];
            let configKey = option.configPath || key;

            if (!value || !value.length) {
                if (!option.defaultValue) {
                    return Promise.resolve();
                }

                let defaultValue = isFunction(option.defaultValue) ?
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
            // Because the 'port' option can end up being different than the one supplied
            // in the URL itself, we want to make sure the port in the URL
            // (if one was there to begin with) is correct.
            let parsedUrl = url.parse(this.instance.config.get('url'));
            if (parsedUrl.port && parsedUrl.port !== this.instance.config.get('server.port')) {
                parsedUrl.port = this.instance.config.get('server.port');
                // url.format won't take the new port unless 'parsedUrl.host' is undefined
                delete parsedUrl.host;

                this.instance.config.set('url', url.format(parsedUrl));
            }

            this.instance.config.save();
        });
    }

    getConfigPrompts(argv) {
        let prompts = [];

        if (!argv.url) {
            // Url command line option has not been supplied, add url config to prompts
            prompts.push({
                type: 'input',
                name: 'url',
                message: 'Enter your blog URL:',
                default: this.instance.config.get('url', 'http://localhost:2368'),
                validate: (value) => validator.isURL(value, { require_protocol: true }) ||
                    'Invalid URL. Your URL should include a protocol, E.g. http://my-ghost-blog.com'
            });
        }

        if (!argv.db || argv.db !== 'sqlite3') {
            prompts.push({
                type: 'input',
                name: 'dbhost',
                message: 'Enter your MySQL hostname:',
                default: this.instance.config.get('database.connection.host', 'localhost')
            }, {
                type: 'input',
                name: 'dbuser',
                message: 'Enter your MySQL username:',
                default: this.instance.config.get('database.connection.user'),
                validate: (val) => Boolean(val) || 'You must supply a MySQL username.'
            }, {
                type: 'password',
                name: 'dbpass',
                message: 'Enter your MySQL password' +
                    `${this.instance.config.has('database.connection.password') ? ' (skip to keep current password)' : ''}:`
            }, {
                type: 'input',
                name: 'dbname',
                message: 'Enter your Ghost database name:',
                default: this.instance.config.get('database.connection.database', `ghost_${this.system.environment}`)
            });
        }

        return prompts;
    }

    run(argv) {
        let key = argv.key;
        let value = argv.value;

        if (key && !value) {
            this.instance.checkEnvironment();
            // getter
            value = this.instance.config.get(key, null);

            if (value) {
                this.ui.log(value);
            }

            return Promise.resolve();
        } else if (key) {
            this.instance.checkEnvironment();
            // setter
            this.instance.config.set(key, value).save();
            return Promise.resolve();
        }

        let prompts = this.getConfigPrompts(argv);

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
