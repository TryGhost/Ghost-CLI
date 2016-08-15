var BaseCommand = require('./base'),
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
        name: 'host',
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

        var path = require('path'),
            fs = require('fs-extra'),
            _ = require('lodash'),

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
            value = _.get(config, key, null);

            if (value) {
                this.ui.log(value);
            }

            return;
        } else if (key) {
            // setter
            _.set(config, key, value);
            saveConfig();
            return;
        }

        return this.ui.prompt(this.prompts).then(function afterPrompts(values) {
            _.assign(config, values);
            saveConfig();
        });
    }
});
