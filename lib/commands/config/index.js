var BaseCommand = require('../base'),
    advancedOptions = require('./advanced'),
    validator = require('validator');

module.exports = {
    name: 'config',
    description: 'configure a Ghost instance',

    arguments: [{
        name: 'key',
        optional: true
    }, {
        name: 'value',
        optional: true
    }],

    options: [{
        name: 'environment',
        alias: 'e',
        description: 'Environment to get/set config for',
        defaultValue: 'production'
    }].concat(advancedOptions)
};

module.exports.Command = BaseCommand.extend({
    prompts: [{
        type: 'input',
        name: 'url',
        message: 'What is your blog url?',
        validate: function (value) {
            return validator.isURL(value, {
                require_protocol: true
            }) || 'Invalid url!';
        }
    }],

    execute: function (key, value, options) {
        // ensure we are within a valid Ghost install
        this.checkValidInstall();

        options.environment = options.environment || 'production';

        var Config = require('../../utils/config'),
            configFile = 'config.' + options.environment + '.json',
            config = Config.load(configFile);

        if (key && !value) {
            // getter
            value = config.get(key, null);

            if (value) {
                if (options.return) {
                    return value;
                }

                this.ui.log(value);
            }

            return;
        } else if (key) {
            // setter
            config.set(key, value).save();
            return;
        }

        this.handleAdvancedOptions(config, options);

        // skip prompt if url already set
        // TODO: make this more generic
        if (options.url) {
            config.set('url', options.url).save();
            return;
        }

        return this.ui.prompt(this.prompts).then(function afterPrompts(values) {
            config.set(values).save();

            if (options.return) {
                return values;
            }
        });
    },

    handleAdvancedOptions: function (config, options) {
        var each = require('lodash/each');

        each(advancedOptions, function (option) {
            var value = options[option.name];

            if (!value) {
                return;
            }

            if (option.validate && option.validate(value) !== true) {
                return;
            }
            config.set(option.configPath || option.name, value);
        });
    }
});
