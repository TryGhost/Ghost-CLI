'use strict';
const path = require('path');
const {get} = require('../../../utils/object-path');

const errors = require('../../../errors');
const Config = require('../../../utils/config');
const options = require('../../../tasks/configure/options');

const taskTitle = 'Validating config';

async function validateConfig(ctx, task) {
    if (!ctx.instance) {
        return task.skip('Instance not set');
    }

    const isRunning = await ctx.instance.isRunning();

    if (isRunning) {
        return task.skip('Instance is currently running');
    }

    const config = Config.exists(path.join(process.cwd(), `config.${ctx.system.environment}.json`));

    if (config === false) {
        throw new errors.ConfigError({
            environment: ctx.system.environment,
            message: 'Config file is not valid JSON',
            task: taskTitle
        });
    }

    const configValidations = Object.values(options).filter(cfg => cfg.validate);

    for (const configItem of configValidations) {
        const key = configItem.configPath || configItem.name;
        const value = get(config, key);

        if (!value) {
            continue;
        }

        const validated = await configItem.validate(value);

        if (validated !== true) {
            throw new errors.ConfigError({
                config: {
                    [key]: value
                },
                message: validated,
                environment: ctx.system.environment,
                task: taskTitle
            });
        }
    }
}

module.exports = {
    title: taskTitle,
    task: validateConfig,
    category: ['start']
};
