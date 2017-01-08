var chalk = require('chalk'),
    assign = require('lodash/assign'),
    Promise = require('bluebird'),
    inquirer = require('inquirer'),
    isFunction = require('lodash/isFunction'),
    ora = require('ora'),

    defaultOptions, UI;

defaultOptions = {
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr,
    verbose: false
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
    options.spinner = options.spinner || 'hamburger';
    options.stream = this.stdout;

    var spinner = ora(options).start();

    return Promise.resolve(isFunction(promiseOrFunction) ? promiseOrFunction() : promiseOrFunction)
        .then(function then(result) {
            spinner.succeed();

            return Promise.resolve(result);
        }).catch(function error(error) {
            spinner.fail();

            return Promise.reject(error);
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

UI.prototype.setVerbosity = function setVerbosity(verbose) {
    this.verbose = !!verbose;
};

UI.prototype.isVerbose = function isVerbose() {
    return this.verbose;
};

module.exports = UI;
