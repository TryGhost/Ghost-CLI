'use strict';
const merge = require('lodash/merge');
const forIn = require('lodash/forIn');
const execa = require('execa');

// TODO: improve error handling
module.exports = function npm(npmArgs, npmConfig, options) {
    let baseConfig = {progress: false}
    let env = process.env;
    // let npm = path.resolve(
    //     __dirname, '../../node_modules/.bin', /^win*/.test(process.platform) ? 'npm.cmd' : 'npm'
    // );

    options = options || {};
    npmArgs = npmArgs || [];
    npmConfig = npmConfig || {};

    forIn(merge(baseConfig, npmConfig), (value, key) => {
        env['npm_config_' + key] = value;
    });

    options.env = merge(options.env || {}, env);

    return execa('npm', npmArgs, options);
};
