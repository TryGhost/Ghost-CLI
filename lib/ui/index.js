'use strict';
const ora = require('ora');
const omit = require('lodash/omit');
const chalk = require('chalk');
const execa = require('execa');
const Listr = require('listr');
const Table = require('cli-table3');
const Promise = require('bluebird');
const inquirer = require('inquirer');
const isObject = require('lodash/isObject');
const stripAnsi = require('strip-ansi');
const ListrError = require('listr/lib/listr-error');
const logSymbols = require('log-symbols');
const isFunction = require('lodash/isFunction');

const errors = require('../errors');
const createRendererClass = require('./renderer');

const defaultOptions = {
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr,
    verbose: false,
    allowPrompt: true,
    auto: false
};

function hasDefault(prompt = {}) {
    return isObject(prompt) && prompt.hasOwnProperty('default');
}

function getDefault(prompt = {}) {
    if (prompt.choices && prompt.choices.length) {
        const defaultChoice = prompt.choices[prompt.default];
        return isObject(defaultChoice) ? defaultChoice.value : defaultChoice;
    }

    return prompt.default;
}

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
        this.options = Object.assign({}, defaultOptions, options);

        // Set up i/o streams
        this.stdin = this.options.stdin;
        this.stdout = this.options.stdout;
        this.stderr = this.options.stderr;
        this.verbose = this.options.verbose;
        this.allowPrompt = this.options.allowPrompt && Boolean(this.stdout.isTTY);
        this.auto = this.options.auto;

        // Add custom prompt module that uses the
        // specified streams
        this.inquirer = inquirer.createPromptModule({
            input: this.stdin,
            output: this.stdout
        });
    }

    get Renderer() {
        // istanbul ignore else
        if (!this._RendererClass) {
            this._RendererClass = createRendererClass(this);
        }

        return this._RendererClass;
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
    run(promiseOrFunction, name, options = {}) {
        const {
            text = name,
            spinner = 'hamburger',
            stream = this.stdout,
            clear = false,
            quiet = false
        } = options;

        const fn = () => Promise.resolve(isFunction(promiseOrFunction) ? promiseOrFunction() : promiseOrFunction);

        // The --quiet flag will skip outputting anything to the UI.
        if (quiet) {
            return fn();
        }

        this.spinner = ora({text, spinner, stream}).start();

        return fn().then((result) => {
            this.spinner[clear ? 'stop' : 'succeed']();
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
     * @param {Object} options Options to pass to cli-table3
     *
     * @method table
     * @public
     */
    table(head, body, options) {
        const table = new Table(Object.assign({head: head}, options || {}));

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
            throw new errors.SystemError('Prompts have been disabled, all options must be provided via command line flags');
        }

        if (this.auto) {
            if (Array.isArray(prompts)) {
                const defaultedPrompts = prompts.filter(hasDefault).reduce(
                    (obj, prompt) => Object.assign({}, obj, {[prompt.name]: getDefault(prompt)}),
                    {}
                );
                const promptsToAsk = prompts.filter(prompt => !hasDefault(prompt));

                if (!promptsToAsk.length) {
                    return Promise.resolve(defaultedPrompts);
                }

                return this.noSpin(() => this.inquirer(promptsToAsk))
                    .then(answers => Object.assign(answers, defaultedPrompts));
            }

            /* istanbul ignore else */
            if (hasDefault(prompts)) {
                return Promise.resolve({[prompts.name]: prompts.default});
            }
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
    confirm(question, defaultAnswer, options = {}) {
        if (!this.allowPrompt || this.auto) {
            return Promise.resolve(defaultAnswer);
        }

        return this.prompt({
            type: 'confirm',
            name: 'yes',
            message: question,
            default: defaultAnswer,
            prefix: options.prefix
        }).then(answer => answer.yes);
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
        const listrOpts = Object.assign({
            renderer: this.verbose ? 'verbose' : this.Renderer,
            exitOnError: true
        }, options || {});

        const listr = new Listr(tasks, listrOpts);
        return context === false ? listr : listr.run(Object.assign(context || {}, {ui: this, listr: listr}));
    }

    /**
     * Runs a sudo command on the system. Outputs the command
     * that it's running.
     *
     * Code inspired by https://github.com/calmh/node-sudo/blob/master/lib/sudo.js
     *
     * @param {string} command Command to run
     * @param {Object} options Options to pass to execa
     * @return Promise<Object> Result of execa command
     *
     * @method sudo
     * @public
     */
    sudo(command, options) {
        options = options || {};
        this.log(`+ sudo ${command}`, 'gray');

        const prompt = '#node-sudo-passwd#';
        const cmd = command.replace(/^ghost/, process.argv.slice(0, 2).join(' '));
        const cp = execa.shell(`sudo -S -p '${prompt}' ${options.sudoArgs || ''} ${cmd}`, omit(options, ['sudoArgs']));

        cp.stderr.on('data', (data) => {
            const lines = data.toString('utf8').split('\n');

            /* istanbul ignore else */
            // If sudo has prompted for a password, then it will be the last line output
            if (lines[lines.length - 1] === prompt) {
                this.prompt({
                    type: 'password',
                    name: 'password',
                    message: 'Sudo Password'
                }).then((answers) => {
                    cp.stdin.write(`${answers.password}\n`);
                });
            }
        });

        return cp;
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
        if (arguments.length > 3) {
            this._logHelp.apply(this, arguments);
            return;
        }

        if (color) {
            message = chalk[color](message);
        }

        if (this.spinner) {
            this.spinner.stop();
            this.spinner.paused = true;
        }

        const stream = stderr ? 'stderr' : 'stdout';
        this[stream].write(`${message}\n`);

        if (this.spinner) {
            this.spinner.start();
            this.spinner.paused = false;
        }
    }

    /**
     * Same options as log, but only logs when `verbose` is set to true
     *
     * @param {string} message
     * @param {string} color
     * @param {bool} stderr
     */
    logVerbose(message, color, stderr) {
        if (this.verbose) {
            return this.log(message, color, stderr);
        }
    }

    /**
     * Shorthand helper to output a help message, which displays a hint indented on the next line
     *
     * Don't call me directly, call ui.log with 4 args.
     *
     * @param {string} message Main message to output
     * @param {string} hint Hint line to output e.g. a command to fix things
     * @param {string} msgColor Main color of the message
     * @param {string} hintType One of link or cmd
     * @param {boolean} solo Is this message output as the last thing?
     */
    _logHelp(message, hint, msgColor, hintType, last) {
        let hintColor = hintType === 'link' ? 'cyan' : 'yellow';
        this.log(`\n${message}: \n\n    ${chalk[hintColor](hint)}${last ? '\n' : ''}`, msgColor);
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
        return this.log(`${logSymbols.success} ${message}`);
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
        return this.log(`${logSymbols.error} ${message}`);
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
        const debugInfo = this._formatDebug(system);

        if (error instanceof errors.CliError) {
            if (error.logMessageOnly) {
                return this.fail(error.message);
            }

            // Error is one that is generated by CLI usage (as in, the CLI itself
            // manually generates this error)
            this.log(`A ${error.type} occurred.\n`, 'red');

            // We always want to output the verbose error to the logfile, so we go ahead and get it now
            const verboseOutput = error.toString(true);

            // Log the verbose error if verbose is set, otherwise log the non-verbose error output
            this.log(this.verbose ? verboseOutput : error.toString(false), null, true);
            this.log(debugInfo, 'yellow');

            if (error.logToFile()) {
                const logLocation = system.writeErrorLog(stripAnsi(`${debugInfo}\n${verboseOutput}`));
                this.log(`\nAdditional log info available in: ${logLocation}`);
            }

            this.log(`\nTry running ${(chalk.cyan('ghost doctor'))} to check your system for known issues.`);

            this.log('\n' + error.help, 'blue');
        } else if (error instanceof ListrError) {
            // Listr errors have an array of errors appended to them
            this.log('One or more errors occurred.', 'red');

            const logOutput = [];

            error.errors.forEach((err, index) => {
                const verboseOutput = err.toString(true);

                this.log(`\n${index + 1}) ${err.options && err.options.task ? err.options.task : err.type}\n`, 'red', true);
                this.log(this.verbose ? verboseOutput : err.toString(false), null, true);

                if (err.logToFile && err.logToFile()) {
                    logOutput.push(stripAnsi(verboseOutput));
                }
            });

            this.log(debugInfo, 'yellow');

            if (logOutput.length) {
                const logLocation = system.writeErrorLog(stripAnsi(`${debugInfo}\n${logOutput.join('\n\n')}`));
                this.log(`\nAdditional log info available in: ${logLocation}`);
            }

            this.log(`\nTry running ${(chalk.cyan('ghost doctor'))} to check your system for known issues.`);
            this.log('\nYou can always refer to https://docs.ghost.org/api/ghost-cli/ for troubleshooting.', 'blue');
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
            const logLocation = system.writeErrorLog(stripAnsi(`${debugInfo}\n${output}`));
            this.log(`\nAdditional log info available in: ${logLocation}`);
            this.log(`\nTry running ${(chalk.cyan('ghost doctor'))} to check your system for known issues.`);
            this.log('\nYou can always refer to https://docs.ghost.org/api/ghost-cli/ for troubleshooting.', 'blue');
        } else if (isObject(error)) {
            // TODO: find better way to handle object errors?
            this.log(JSON.stringify(error), null, true);
            this.log(`\nTry running ${(chalk.cyan('ghost doctor'))} to check your system for known issues.`);
        } else if (error !== false) {
            // If the error is false, we're just exiting (makes the promise chains easier)
            this.log('An unknown error occured.', null, true);
            this.log(`\nTry running ${(chalk.cyan('ghost doctor'))} to check your system for known issues.`);
        }
    }

    /**
     * Helper method to format the debug information whenever an error occurs
     *
     * @param {System} system System instance
     * @return string Formated debug info
     *
     * @method _formatString
     * @private
     */
    _formatDebug(system) {
        return 'Debug Information:\n' +
            `    OS: ${system.operatingSystem.os}, v${system.operatingSystem.version}\n` +
            `    Node Version: ${process.version}\n` +
            `    Ghost-CLI Version: ${system.cliVersion}\n` +
            `    Environment: ${system.environment}\n` +
            `    Command: 'ghost ${process.argv.slice(2).join(' ')}'`;
    }
}

module.exports = UI;
