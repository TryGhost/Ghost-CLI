const url = require('url');
const Promise = require('bluebird');
const isFunction = require('lodash/isFunction');
const options = require('./options');
const {ConfigError} = require('../../errors');

function syncUrl(config, options) {
    if (options.url && options.port) {
        // If we have supplied both url and port options via args, we
        // don't want to override anything so just return
        return;
    }

    // Because the 'port' option can end up being different than the one supplied
    // in the URL itself, we want to make sure the port in the URL
    // (if one was there to begin with) is correct.
    const parsedUrl = url.parse(config.get('url'));
    if (parsedUrl.port && parsedUrl.port !== config.get('server.port', parsedUrl.port)) {
        parsedUrl.port = config.get('server.port');
        // url.format won't take the new port unless 'parsedUrl.host' is undefined
        delete parsedUrl.host;

        config.set('url', url.format(parsedUrl));
    }
}

/**
 * Parses options from argv or prompt, validates them, and sets them in the config
 *
 * @param {Config} config Config object
 * @param {String} environment Environment name
 * @param {Object} passedOptions Options passed via argv or prompts
 * @return {Promise}
 */
module.exports = function parseOptions(config, environment, passedOptions) {
    return Promise.each(Object.keys(options), (key) => {
        const {
            configPath = key,
            defaultValue,
            transform,
            validate = () => true
        } = options[key];
        let value = passedOptions[key];

        if (!value || !value.toString().length) {
            if (!defaultValue) {
                return Promise.resolve();
            }

            const defaultOption = isFunction(defaultValue) ? defaultValue(config, environment) : defaultValue;

            return Promise.resolve(defaultOption).then((result) => {
                config.set(configPath, result);
            });
        }

        if (value && transform) {
            value = transform(value);
        }

        return Promise.resolve(validate(value)).then((validated) => {
            if (validated !== true) {
                return Promise.reject(new ConfigError({
                    config: {[configPath]: value},
                    message: validated,
                    environment
                }));
            }

            config.set(configPath, value);
        });
    }).then(() => {
        syncUrl(config, passedOptions);
        config.save();
    });
};
