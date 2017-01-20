var merge = require('lodash/merge'),
    forIn = require('lodash/forIn'),
    execa = require('execa');

// TODO: improve error handling
module.exports = function npm(npmArgs, npmConfig, options) {
    var baseConfig = {progress: false},
        env = process.env;

    options = options || {};
    npmArgs = npmArgs || [];
    npmConfig = npmConfig || {};

    forIn(merge(baseConfig, npmConfig), function (value, key) {
        env['npm_config_' + key] = value;
    });

    options.env = merge(options.env || {}, env);

    return execa('npm', npmArgs, options);
};
