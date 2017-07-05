'use strict';
const path = require('path');
const get = require('lodash/get');
const filter = require('lodash/filter');
const Promise   = require('bluebird');

const errors = require('../../../errors');
const Config = require('../../../utils/config');
const advancedOptions = require('../../config/advanced');

module.exports = [{
    title: 'Validating config',
    task: (ctx) => {
        let config = Config.exists(path.join(process.cwd(), `config.${ctx.environment}.json`));

        /**
        * CASE: `Config.exists()` returns an `options.message` property with a detailed error message
        * in case an error (e. g. file doesn't exist or has syntaxerrors) occurred.
        * If the `options` property doesn't exist, the config file was found and valid.
        */
        if (config.options && config.options.message) {
            return Promise.reject(new errors.ConfigError({
                environment: ctx.environment,
                message: `The config.${ctx.environment}.json file is missing or not valid JSON`,
                context: config.options.message
            }));
        }

        let configValidations = filter(advancedOptions, cfg => cfg.validate);

        return Promise.each(configValidations, (configItem) => {
            let key = configItem.configPath || configItem.name
            let value = get(config, key);

            if (!value) {
                return;
            }

            return Promise.resolve(configItem.validate(value)).then((validated) => {
                if (validated !== true) {
                    return Promise.reject(new errors.ConfigError({
                        configKey: key,
                        configValue: value,
                        message: validated,
                        environment: ctx.environment
                    }));
                }
            });
        });
    }
}];
