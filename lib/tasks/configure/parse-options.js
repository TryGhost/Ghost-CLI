const url = require('url');
const options = require('./options');
const {ConfigError} = require('../../errors');

function syncUrl(config, passedOptions) {
    if (passedOptions.url && passedOptions.port) {
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
module.exports = async function parseOptions(config, environment, passedOptions) {
    for (const key of Object.keys(options)) {
        const {
            configPath = key,
            defaultValue,
            transform,
            validate = () => true
        } = options[key];
        let value = passedOptions[key];

        if (!value || !value.toString().length) {
            if (!defaultValue) {
                continue;
            }

            const result = await (typeof defaultValue === 'function' ? defaultValue(config, environment) : defaultValue);
            config.set(configPath, result);
            continue;
        }

        if (value && transform) {
            value = transform(value);
        }

        const validated = await validate(value);

        if (validated !== true) {
            throw new ConfigError({
                config: {[configPath]: value},
                message: validated,
                environment
            });
        }

        config.set(configPath, value);
    }

    syncUrl(config, passedOptions);
    config.save();
};
