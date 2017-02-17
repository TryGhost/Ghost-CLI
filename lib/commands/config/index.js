'use strict';
const _         = require('lodash');
const url       = require('url');
const validator = require('validator');
const Promise   = require('bluebird');

const advancedOptions   = require('./advanced');
const checkValidInstall = require('../../utils/check-valid-install');
const Config            = require('../../utils/config');

function handleAdvancedOptions(config, options) {
    return Promise.each(advancedOptions, (option) => {
        let value = options[option.name];
        let key = option.configPath || option.name;

        if (!value) {
            if (!option.default) {
                return Promise.resolve();
            }

            return Promise.resolve(_.isFunction(option.default) ? option.default(config) : option.default).then((defaultValue) => {
                config.set(key, defaultValue);
            });
        }

        return Promise.resolve(option.validate ? option.validate(value) : true).then((validated) => {
            if (validated !== true) {
                return Promise.reject(validated);
            }

            config.set(key, value);
        });
    }).then(() => {
        // Because the 'port' option can end up being different than the one supplied
        // in the URL itself, we want to make sure the port in the URL
        // (if one was there to begin with) is correct.
        let parsedUrl = url.parse(config.get('url'));
        if (parsedUrl.port && parsedUrl.port !== config.get('server.port')) {
            parsedUrl.port = config.get('server.port');
            // url.format won't take the new port unless 'parsedUrl.host' is undefined
            delete parsedUrl.host;

            config.set('url', url.format(parsedUrl));
        }

        config.save();
    });
}

module.exports.handleAdvancedOptions = handleAdvancedOptions;

module.exports.execute = function execute(key, value, options) {
    let prompts = [{
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
        default: () => `ghost_${this.environment}`
    }];

    // ensure we are within a valid Ghost install
    checkValidInstall('config');

    let config = Config.load(this.environment);

    if (key && !value) {
        // getter
        value = config.get(key, null);

        if (value) {
            this.ui.log(value);
        }

        return Promise.resolve();
    } else if (key) {
        // setter
        config.set(key, value).save();
        return Promise.resolve();
    }

    // If url && db are set or if
    // every prompt is provided in options
    // then skip prompts
    if ((options.db && options.url) || _.every(_.map(prompts, 'name'), _.wrap(_.keys(options), _.includes))) {
        return handleAdvancedOptions(config, options).then(() => {
            return config;
        });
    }

    return this.ui.prompt(prompts).then((values) => {
        // because we don't want to prompt for the database type, we go ahead and
        // supply it here manually if it's not supplied already
        values.db = values.db || 'mysql';

        return handleAdvancedOptions(config, _.assign(options, values));
    }).then(() => {
        return config;
    });
};
