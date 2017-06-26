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
        let system = ctx.system;

        if (Config.exists(path.join(process.cwd(), `config.${system.mode}.json`)) === false) {
            // TODO: extend this to show where invalid JSON is
            return Promise.reject(new errors.ConfigError({
                environment: system.mode,
                message: 'Config file is not valid JSON'
            }));
        }

        system.loadInstanceConfig();
        let configValidations = filter(advancedOptions, cfg => cfg.validate);

        return Promise.each(configValidations, (configItem) => {
            let key = configItem.configPath || configItem.name
            let value = system.instanceConfig.get(key);

            if (!value) {
                return;
            }

            return Promise.resolve(configItem.validate(value)).then((validated) => {
                if (validated !== true) {
                    return Promise.reject(new errors.ConfigError({
                        configKey: key,
                        configValue: value,
                        message: validated,
                        environment: system.mode
                    }));
                }
            });
        });
    }
}];
