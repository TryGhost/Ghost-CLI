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

        var assign = require('lodash/assign'),
            path = require('path'),
            get = require('lodash/get'),
            set = require('lodash/set'),
            fs = require('fs-extra'),

            configFile = 'config.' + options.environment + '.json',
            configPath = path.join(process.cwd(), 'config', configFile),
            config;

        config = (fs.existsSync(configPath)) ? fs.readJsonSync(configPath, {throws: false}) || {} : {};

        function saveConfig() {
            var currentPath = path.join(process.cwd(), 'current', configFile);
            fs.writeJsonSync(configPath, config);
            fs.removeSync(currentPath);
            fs.ensureSymlinkSync(configPath, currentPath);
        }

        if (key && !value) {
            // getter
            value = get(config, key, null);

            if (value) {
                this.ui.log(value);
            }

            return;
        } else if (key) {
            // setter
            set(config, key, value);
            saveConfig();
            return;
        }

        this.handleAdvancedOptions(config, options);

        return this.ui.prompt(this.prompts).then(function afterPrompts(values) {
            assign(config, values);
            saveConfig();
        });
    },

    handleAdvancedOptions: function (config, options) {
        var each = require('lodash/each'),
            set = require('lodash/set');

        each(advancedOptions, function (option) {
            var value = options[option.name];

            if (!value) {
                return;
            }

            if (option.validate && option.validate(value) !== true) {
                return;
            }

            set(config, option.configPath || option.name, value);
        });
    }
});
