var merge = require('lodash/merge'),
    forIn = require('lodash/forIn'),
    Promise = require('bluebird'),
    spawnSync = require('child_process').spawnSync,
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
    options.encoding = 'utf8';

    return new Promise(function (resolve, reject) {
        // Why do we wrap a synchronous function in a promise, you say?
        // well, spawnSync handles a lot of the stdout/stderr/etc. capturing, but we still want
        // the progress bars to show up, meaning the npm call needs to act like it's asynchronous
        // This basically makes the code a lot more concise.
        var result = spawnSync(path.resolve(__dirname, '../../node_modules/.bin/npm'), npmArgs, options);

        if (result.error) {
            return reject(result.error);
        }

        if (result.status !== 0) {
            return reject(new Error('Npm process exited with code: ' + result.status));
        }

        return resolve(result.stdout);
    });
};
