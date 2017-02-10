'use strict';
const ora       = require('ora');
const chalk     = require('chalk');
const Table     = require('cli-table2');
const assign    = require('lodash/assign');
const Promise   = require('bluebird');
const inquirer  = require('inquirer');
const isFunction = require('lodash/isFunction');

const defaultOptions = {
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr
};

class UI {
    constructor(options) {
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
    }

    run(promiseOrFunction, name, options) {
        options = options || {};
        options.text = options.text || name;
        options.spinner = options.spinner || 'dots';
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
    }

    table(head, body, options) {
        let table = new Table(assign({head: head}, options || {}));

        table.push.apply(table, body);
        this.log(table.toString());
    }

    log(message, color) {
        if (color) {
            message = chalk[color](message);
        }

        this.stdout.write(message + '\n');
    }

    success(message) {
        return this.log(message, 'green');
    }

    fail(message) {
        return this.log(message, 'red');
    }
}

module.exports = UI;
