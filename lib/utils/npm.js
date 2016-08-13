var merge = require('lodash/merge'),
    Promise = require('bluebird'),
    forIn = require('lodash/forIn'),
    spawn = require('child_process').spawn,
    path = require('path');

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

    return new Promise(function runNpm(resolve, reject) {
        var cp = spawn(path.resolve(__dirname, '../../node_modules/.bin/npm'), npmArgs, options);

        cp.on('error', function (error) {
            return reject(error);
        });

        cp.on('exit', function (code, signal) {
            if (code && code !== 0) {
                return reject(code);
            }

            return resolve(code || signal);
        });
    });
};
