'use strict';
const url           = require('url');
const every         = require('lodash/every');
const validator     = require('validator');
const isFunction    = require('lodash/isFunction');
const Promise       = require('bluebird');

const Command           = require('../../command');
const advancedOptions   = require('./advanced');
const errors            = require('../../errors');

class ConfigCommand extends Command {
    constructor(ui, system) {
        super(ui, system);

        let instance = this.system.getInstance();
        instance.loadConfig(true);
        this.config = instance.config;
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
                    option.defaultValue(this.config, this.system.environment) :
                    option.defaultValue;

                return Promise.resolve(defaultValue).then((result) => {
                    this.config.set(configKey, result);
                });
            }

            return Promise.resolve(option.validate ? option.validate(value) : true).then((validated) => {
                if (validated !== true) {
                    return Promise.reject(new errors.ConfigError({
                        configKey: configKey,
                        configValue: value,
                        message: validated,
                        environment: this.environment
                    }));
                }

                this.config.set(configKey, value);
            });
        }).then(() => {
            // Because the 'port' option can end up being different than the one supplied
            // in the URL itself, we want to make sure the port in the URL
            // (if one was there to begin with) is correct.
            let parsedUrl = url.parse(this.config.get('url'));
            if (parsedUrl.port && parsedUrl.port !== this.config.get('server.port')) {
                parsedUrl.port = this.config.get('server.port');
                // url.format won't take the new port unless 'parsedUrl.host' is undefined
                delete parsedUrl.host;

                this.config.set('url', url.format(parsedUrl));
            }

            this.config.save();
        });
    }

    run(argv) {
        let key = argv.key;
        let value = argv.value;

        let prompts = [{
            type: 'input',
            name: 'url',
            message: 'Enter your blog URL:',
            default: 'http://localhost:2368',
            validate: function (value) {
                return validator.isURL(value, {
                    require_protocol: true
                }) || 'Invalid URL. Your URL should include a protocol, E.g. http://my-ghost-blog.com';
            }
        }, {
            type: 'input',
            name: 'dbhost',
            message: 'Enter your MySQL hostname:',
            default: 'localhost'
        }, {
            type: 'input',
            name: 'dbuser',
            message: 'Enter your MySQL username:'
        }, {
            type: 'password',
            name: 'dbpass',
            message: 'Enter your MySQL password:'
        }, {
            type: 'input',
            name: 'dbname',
            message: 'Enter your Ghost database name:',
            default: () => `ghost_${this.system.environment}`
        }];

        if (key && !value) {
            // getter
            value = this.config.get(key, null);

            if (value) {
                this.ui.log(value);
            }

            return Promise.resolve();
        } else if (key) {
            // setter
            this.config.set(key, value).save();
            return Promise.resolve();
        }

        // If url && db are set or if
        // every prompt is provided in options
        // then skip prompts
        if ((argv.db && argv.url) || every(prompts.map((prompt) => prompt.name), (name) => argv[name])) {
            return this.handleAdvancedOptions(argv);
        }

        return this.ui.prompt(prompts).then((values) => {
            // because we don't want to prompt for the database type, we go ahead and
            // supply it here manually if it's not supplied already
            values.db = values.db || 'mysql';

            return this.handleAdvancedOptions(Object.assign(argv, values));
        });
    }
}

ConfigCommand.description = 'Configure a Ghost instance';
ConfigCommand.params = '[key] [value]';
ConfigCommand.options = advancedOptions;

module.exports = ConfigCommand;
