var BaseCommand = require('./base'),
    _ = require('lodash');

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
        description: 'Environment to get/set config for'
    }],

    prompts: [{
        type: 'input',
        name: 'port',
        message: 'What port would you like Ghost to listen on?',
        default: 2368,
        validate: function (value) {
            if (_.isInteger(_.toNumber(value))) {
                return true;
            }

            return 'Port must be a valid integer!';
        }
    }],

    execute: function (key, value, options) {
        // ensure we are within a valid Ghost install
        this.checkValidInstall();

        var path = require('path'),
            fs = require('fs-extra'),

            environment = options.environment || 'production',
            configFile = 'config.' + environment + '.json',
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
