var chalk = require('chalk'),
    assign = require('lodash/assign'),
    Promise = require('bluebird'),
    inquirer = require('inquirer'),
    isFunction = require('lodash/isFunction'),

    Spinner = require('./spinner'),
    defaultOptions, UI;

defaultOptions = {
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr
};

UI = function UI(options) {
    this.options = assign(defaultOptions, options);

    // Set up i/o streams
    this.stdin = this.options.stdin;
    this.stdout = this.options.stdout;
    this.stderr = this.options.stderr;

    // Add custom prompt module that uses the
    // specified streams
    this.prompt = inquirer.createPromptModule({
        input: this.stdin,
        output: this.stdout
    });
};

UI.prototype.run = function run(promiseOrFunction, name, options) {
    options = options || {};
    options.text = options.text || name;
    options.stream = this.stdout;

    var spinner = new Spinner(options);
    spinner.start();

    return Promise.resolve(isFunction(promiseOrFunction) ? promiseOrFunction() : promiseOrFunction)
        .then(function then() {
            spinner.succeed();

            return Promise.resolve.apply(Promise, arguments);
        }).catch(function error() {
            spinner.fail();

            return Promise.reject.apply(Promise, arguments);
        });
};

UI.prototype.log = function log(message, color) {
    if (color) {
        message = chalk[color](message);
    }

    this.stdout.write(message + '\n');
};

UI.prototype.success = function success(message) {
    return this.log(message, 'green');
};

UI.prototype.fail = function error(message) {
    return this.log(message, 'red');
};

module.exports = UI;
