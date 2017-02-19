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
        this.inquirer = inquirer.createPromptModule({
            input: this.stdin,
            output: this.stdout
        });
    }

    run(promiseOrFunction, name, options) {
        options = options || {};
        options.text = options.text || name;
        options.spinner = options.spinner || 'dots';
        options.stream = this.stdout;

        this.spinner = ora(options).start();

        return Promise.resolve(isFunction(promiseOrFunction) ? promiseOrFunction() : promiseOrFunction)
            .then((result) => {
                this.spinner.succeed();

                return Promise.resolve(result);
            }).catch((error) => {
                this.spinner.fail();

                return Promise.reject(error);
            }).finally(() => {
                this.spinner = null;
            });
    }

    table(head, body, options) {
        let table = new Table(assign({head: head}, options || {}));

        table.push.apply(table, body);
        this.log(table.toString());
    }

    prompt(prompts) {
        if (!this.spinner) {
            return this.inquirer(prompts);
        }

        this.spinner.stop();
        return this.inquirer(prompts).then((result) => {
            this.spinner.start();
            return result;
        });
    }

    noSpin(promise) {
        if (!this.spinner) {
            return promise;
        }

        this.spinner.stop();
        return promise.then((result) => {
            this.spinner.start();
            return result;
        });
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
