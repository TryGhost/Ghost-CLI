var BaseCommand = require('../base'),
    advancedOptions = require('./advanced'),
    validator = require('validator');

module.exports = BaseCommand.extend({
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
    }],

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

    init: function () {
        this.options = this.options.concat(advancedOptions);

        this._super.apply(this, arguments);
    },

    execute: function (key, value, options) {
        // ensure we are within a valid Ghost install
        this.checkValidInstall();

        options.environment = options.environment || 'production';

        var Config = require('../../utils/config'),
            configFile = 'config.' + options.environment + '.json',
            config = new Config(configFile);

        if (key && !value) {
            // getter
            value = config.get(key, null);

            if (value) {
                this.ui.log(value);
            }

            return;
        } else if (key) {
            // setter
            config.set(key, value).save();
            return;
        }

        this.handleAdvancedOptions(config, options);

        return this.ui.prompt(this.prompts).then(function afterPrompts(values) {
            config.set(values).save();
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
