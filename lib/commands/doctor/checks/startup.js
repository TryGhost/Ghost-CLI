'use strict';
const path = require('path');
const get = require('lodash/get');
const filter = require('lodash/filter');
const Promise   = require('bluebird');

const errors = require('../../../errors');
const Config = require('../../../utils/config');
const advancedOptions = require('../../config/advanced');
const checkValidInstall = require('../../../command').checkValidInstall;

module.exports = [{
    title: 'Validating config',
    task: (ctx) => {
        if (!ctx.environment) {
            // Environment is not provided (e.g. through `ghost start`), we need to do some manual checking
            checkValidInstall('doctor startup');
            ctx.system.getInstance().checkEnvironment();
            ctx.environment = ctx.system.environment;
        }

        let config = Config.exists(path.join(process.cwd(), `config.${ctx.environment}.json`));

        if (config === false) {
            return Promise.reject(new errors.ConfigError({
                environment: ctx.environment,
                message: 'Config file is not valid JSON'
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
                        config: {
                            [key]: value
                        },
                        message: validated,
                        environment: ctx.environment
                    }));
                }
            });
        });
    }
}];
