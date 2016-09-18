var merge = require('lodash/merge'),
    Promise = require('bluebird'),
    forIn = require('lodash/forIn'),
    spawn = require('child_process').spawn,
    path = require('path');

// TODO: improve error handling
module.exports = function npm(npmArgs, npmConfig, options) {
    var baseConfig = {progress: false},
        env = process.env,
        captureOutput;

    options = options || {};
    npmArgs = npmArgs || [];
    npmConfig = npmConfig || {};

    captureOutput = options.captureOutput || false;
    delete options.captureOutput;

    forIn(merge(baseConfig, npmConfig), function (value, key) {
        env['npm_config_' + key] = value;
    });

    options.env = merge(options.env || {}, env);

    return new Promise(function runNpm(resolve, reject) {
        var cp = spawn(path.resolve(__dirname, '../../node_modules/.bin/npm'), npmArgs, options),
            output, ws, isString;

        if (captureOutput) {
            isString = require('lodash/isString');
            ws = require('stream').Writable({decodeStrings: false});
            output = '';

            ws._write = function (chunk, enc, next) {
                if (!isString(chunk)) {
                    output += chunk.toString();
                } else {
                    output += chunk;
                }

                next();
            };

            cp.stdout.pipe(ws);
        }

        cp.on('error', function (error) {
            return reject(error);
        });

        cp.on('exit', function (code, signal) {
            if (code && code !== 0) {
                return reject(code);
            }

            if (captureOutput && output) {
                return resolve(output);
            }

            return resolve(code || signal);
        });
    });
};
