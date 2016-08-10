var Promise = require('bluebird'),
    Spinner = require('./spinner'),
    isFunction = require('lodash/isFunction');

module.exports = function runProcess(promiseOrFunction, name, options) {
    options = options || {};
    options.text = options.text || name;

    var spinner = new Spinner(options);

    spinner.start();

    return Promise.resolve(isFunction(promiseOrFunction) ? promiseOrFunction() : promiseOrFunction)
        .then(function () {
            spinner.succeed();

            return Promise.resolve.apply(Promise, arguments);
        }).catch(function () {
            spinner.fail();

            return Promise.reject.apply(Promise, arguments);
        });
};
