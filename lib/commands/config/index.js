var BaseCommand = require('../base'),
    advancedOptions = require('./advanced'),
    validator = require('validator'),
    _ = require('lodash'),
    environment;

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
        message: 'Enter your blog URL:',
        default: 'http://localhost:2368',
        validate: function (value) {
            return validator.isURL(value, {
                require_protocol: true
            }) || 'Invalid URL. Your URL should include a protocol, E.g. http://my-ghost-blog.com';
        }
    }, {
        type: 'input',
        name: 'dbhost',
        message: 'Enter your MySQL hostname:',
        default: 'localhost'
    }, {
        type: 'input',
        name: 'dbuser',
        message: 'Enter your MySQL username:'
    }, {
        type: 'password',
        name: 'dbpass',
        message: 'Enter your MySQL password:'
    }, {
        type: 'input',
        name: 'dbname',
        message: 'Enter your Ghost database name:',
        default: function () {
            return 'ghost_' + (environment || 'production');
        }
    }],

    execute: function (key, value, options) {
        // ensure we are within a valid Ghost install
        this.checkValidInstall();

        environment = options.environment || 'production';

        var Config = require('../../utils/config'),
            configFile = 'config.' + environment + '.json',
            config = Config.load(configFile),
            self = this;

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

        // If url && db are set or if
        // every prompt is provided in options
        // then skip prompts
        if ((options.db && options.url) ||
            _.every(_.map(this.prompts, 'name'), _.wrap(_.keys(options), _.includes))) {
            this.handleAdvancedOptions(config, options);
            return config;
        }

        return this.ui.prompt(this.prompts).then(function afterPrompts(values) {
            // because we don't want to prompt for the database type, we go ahead and
            // supply it here manually if it's not supplied already
            values.db = values.db || 'mysql';

            self.handleAdvancedOptions(config, _.assign(options, values));
            return config;
        });
    },

    handleAdvancedOptions: function (config, options) {
        _.each(advancedOptions, function (option) {
            var value = options[option.name];

            if (!value) {
                if (!option.default) {
                    return;
                }

                value = (_.isFunction(option.default)) ? option.default(config) : option.default;
            } else if (option.validate && option.validate(value) !== true) {
                return;
            }

            config.set(option.configPath || option.name, value);
        });

        config.save();
    }
});
