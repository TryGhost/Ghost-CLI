'use strict';
const ora       = require('ora');
const chalk     = require('chalk');
const execa     = require('execa');
const Listr     = require('listr');
const Table     = require('cli-table2');
const assign    = require('lodash/assign');
const Promise   = require('bluebird');
const inquirer  = require('inquirer');
const stripAnsi = require('strip-ansi');
const isFunction = require('lodash/isFunction');
const isObject = require('lodash/isObject');

const errors = require('../errors');
const CLIRenderer = require('./renderer');

const defaultOptions = {
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr,
    verbose: false,
    allowPrompt: true
};

/**
 * UI class. Handles all interaction with the user via the terminal
 *
 * @class UI
 */
class UI {
    /**
     * Creates the UI instance
     * @param {Object} options
     */
    constructor(options) {
        this.options = assign(defaultOptions, options);

        // Set up i/o streams
        this.stdin = this.options.stdin;
        this.stdout = this.options.stdout;
        this.stderr = this.options.stderr;
        this.verbose = this.options.verbose;
        this.allowPrompt = this.options.allowPrompt;

        // Add custom prompt module that uses the
        // specified streams
        this.inquirer = inquirer.createPromptModule({
            input: this.stdin,
            output: this.stdout
        });

        CLIRenderer.ui = this;
    }

    /**
     * Runs a spinner while a promise is pending
     *
     * @param {Promise|Function} promiseOrFunction A promise or a function to run with a spinner
     * @param {string} name Text to output alongside the spinner
     * @param {Object} options Options to override the ora spinner
     * @return Promise<any>
     *
     * @method run
     * @public
     */
    run(promiseOrFunction, name, options) {
        options = options || {};
        options.text = options.text || name;
        options.spinner = options.spinner || 'hamburger';
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

    /**
     * Outputs a table
     *
     * @param {Array} head Column titles
     * @param {Array} body Array of table rows
     * @param {Object} options Options to pass to cli-table2
     *
     * @method table
     * @public
     */
    table(head, body, options) {
        let table = new Table(assign({head: head}, options || {}));

        table.push.apply(table, body);
        this.log(table.toString());
    }

    /**
     * Prompts a user for input. Uses inquirer to handle prompts
     *
     * @param {Array|Object} prompts Prompts to run
     * @return Promise<Object> Promise with results of prompts
     *
     * @method prompt
     * @public
     */
    prompt(prompts) {
        if (!this.allowPrompt) {
            throw new errors.SystemError('Prompts have been disabled, please provide options via command line flags');
        }

        return this.noSpin(() => this.inquirer(prompts));
    }

    /**
     * Shorthand helper to ask a simple yes/no question
     *
     * @param {string} question Question to ask
     * @param {bool} defaultAnswer Default answer (true or false)
     *
     * @method confirm
     * @public
     */
    confirm(question, defaultAnswer) {
        return this.prompt({
            type: 'confirm',
            name: 'yes',
            message: question,
            default: defaultAnswer
        });
    }

    /**
     * Runs a set of Listr tasks. Uses Listr under the hood
     *
     * @param {Array} tasks Listr Task objects
     * @param {Object|bool} context Context to run the tasks with
     * @param {Object} options Additional Listr options
     * @return Listr|Promise<void> Listr object if context === false, otherwise
     *                             a promise that resolves once the tasks have
     *                             completed
     *
     * @method listr
     * @public
     */
    listr(tasks, context, options) {
        let listrOpts = Object.assign({
            renderer: this.verbose ? 'verbose' : CLIRenderer
        }, options);

        let listr = new Listr(tasks, listrOpts);
        return context === false ? listr : listr.run(Object.assign(context || {}, { ui: this, listr: listr }));
    }

    /**
     * Runs a sudo command on the system. Outputs the command
     * that it's running
     *
     * @param {string} command Command to run
     * @param {Object} options Options to pass to execa
     * @return Promise<Object> Result of execa command
     *
     * @method sudo
     * @public
     */
    sudo(command, options) {
        this.log(`Running sudo command: ${command}`, 'gray');

        return this.noSpin(() => {
            let execaOptions = assign({
                stdio: 'inherit'
            }, options || {});

            return execa.shell(
                `sudo ${command.replace(/^ghost/, process.argv.slice(0, 2).join(' '))}`,
                execaOptions
            );
        });
    }

    /**
     * Ensure that no spinner runs whilst a command is executing. Useful for
     * prompts, or commands that require prompts
     *
     * @param {Promise|Function} promiseOrFunc
     * @return Promise
     *
     * @method noSpin
     * @public
     */
    noSpin(promiseOrFunc) {
        if (this.spinner) {
            this.spinner.stop();
            this.spinner.paused = true;
        }

        return Promise.resolve(isFunction(promiseOrFunc) ? promiseOrFunc() : promiseOrFunc).then((result) => {
            if (this.spinner) {
                this.spinner.start();
                this.spinner.paused = false;
            }

            return result;
        });
    }

    /**
     * Like console.log, but with color and can output to stderr. Also
     * ensures no spinner covers up the message
     *
     * @param {string} message Message to log
     * @param {string} color Color to log message in
     * @param {bool} stderr If true, output to stderr rather than stdout
     *
     * @method log
     * @public
     */
    log(message, color, stderr) {
        if (color) {
            message = chalk[color](message);
        }

        if (this.spinner) {
            this.spinner.stop();
            this.spinner.paused = true;
        }

        let stream = stderr ? 'stderr' : 'stdout';
        this[stream].write(`${message}\n`);

        if (this.spinner) {
            this.spinner.start();
            this.spinner.paused = false;
        }
    }

    /**
     * Shorthand helper to output a green message
     *
     * @param {string} message Message to output
     *
     * @method success
     * @public
     */
    success(message) {
        return this.log(message, 'green');
    }

    /**
     * Shorthand helper method to output a red message
     *
     * @param {string} message Message to output
     *
     * @method fail
     * @public
     */
    fail(message) {
        return this.log(message, 'red');
    }

    /**
     * Error handler for the CLI. Takes a given error and outputs a formated and more human-readable
     * error to the specified out stream.
     *
     * @param {Error|Object} error Error to handle
     * @param {System} System object
     *
     * @method error
     * @public
     */
    error(error, system) {
        let debugInfo = this._formatDebug(system);

        if (error instanceof errors.CliError) {
            // Error is one that is generated by CLI usage (as in, the CLI itself
            // maunally generates this error)
            this.log(`A ${error.type} occured.\n`, 'red');

            // We always want to output the verbose error to the logfile, so we go ahead and get it now
            let verboseOutput = error.toString(true);

            // Log the verbose error if verbose is set, otherwise log the non-verbose error output
            this.log(this.verbose ? verboseOutput : error.toString(false), null, true);
            this.log(debugInfo, 'yellow');

            if (error.logToFile()) {
                let logLocation = system.writeErrorLog(stripAnsi(`${debugInfo}\n${verboseOutput}`));
                this.log(`\nAdditional log info available in: ${logLocation}`);
            }
        } else if (error instanceof Error) {
            // System errors or regular old errors go here.
            let output = `An error occurred.\n${chalk.yellow('Message:')} '${error.message}'\n\n`;

            if (!this.verbose) {
                this.log(output, 'red', true);
            }

            if (error.stack) {
                output += `${chalk.yellow('Stack:')} ${error.stack}\n`;
            }

            if (error.code) {
                output += `${chalk.yellow('Code:')} ${error.code}\n`;
            }

            if (error.path) {
                output += `${chalk.yellow('Path:')} ${error.path}\n`;
            }

            if (this.verbose) {
                this.log(output, 'red', true);
            }

            this.log(debugInfo, 'yellow');
            let logLocation = system.writeErrorLog(stripAnsi(`${debugInfo}\n${output}`));
            this.log(`\nAdditional log info available in: ${logLocation}`);
        } else if (isObject(error)) {
            // TODO: find better way to handle object errors?
            this.log(JSON.stringify(error), null, true);
        } else if (error !== false) {
            // If the error is false, we're just exiting (makes the promise chains easier)
            this.log('An unknown error occured.', null, true);
        }
    }

    /**
     * Helper method to format the debug information whenever an error occurs
     *
     * @param {Syste} system System instance
     * @return string Formated debug info
     *
     * @method _formatString
     * @private
     */
    _formatDebug(system) {
        return 'Debug Information:\n' +
            `    Node Version: ${process.version}\n` +
            `    Ghost-CLI Version: ${system.cliVersion}\n` +
            `    Environment: ${system.environment}\n` +
            `    Command: 'ghost ${process.argv.slice(2).join(' ')}'`;
    }
}

module.exports = UI;
