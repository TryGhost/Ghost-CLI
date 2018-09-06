'use strict';
const get = require('lodash/get');
const path = require('path');
const filter = require('lodash/filter');
const Promise = require('bluebird');

const errors = require('../../../errors');
const Config = require('../../../utils/config');
const options = require('../../../tasks/configure/options');

const taskTitle = 'Validating config';

function validateConfig(ctx, task) {
    if (!ctx.instance) {
        return task.skip('Instance not set');
    }

    return ctx.instance.running().then((isRunning) => {
        if (isRunning) {
            return task.skip('Instance is currently running');
        }

        const config = Config.exists(path.join(process.cwd(), `config.${ctx.system.environment}.json`));

        if (config === false) {
            return Promise.reject(new errors.ConfigError({
                environment: ctx.system.environment,
                message: 'Config file is not valid JSON',
                task: taskTitle
            }));
        }

        const configValidations = filter(options, cfg => cfg.validate);

        return Promise.each(configValidations, (configItem) => {
            const key = configItem.configPath || configItem.name;
            const value = get(config, key);

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
                        environment: ctx.system.environment,
                        task: taskTitle
                    }));
                }
            });
        });
    });
}

module.exports = {
    title: taskTitle,
    task: validateConfig,
    category: ['start']
};
