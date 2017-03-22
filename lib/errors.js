'use strict';
const chalk = require('chalk');

/*
 * Base CLI Error class
 */
class CliError extends Error {
    constructor(options) {
        options = options || {};

        if (typeof options === 'string') {
            options = {message: options};
        }

        super(options.message || 'An error occurred.');

        Error.captureStackTrace(this, this.constructor);

        this.context = options.context || {};
        this.options = options;
    }

    /**
     * @return {string} Class name of error
     */
    get type() {
        return this.constructor.name;
    }

    /**
     * Whether or not to log this error to a `ghost-cli-{date}.log` file
     *
     * @return {boolean}
     */
    logToFile() {
        return (this.options.log === false) ? false : true;
    }

    /**
     * Error message string
     * @param {boolean} verbose - Whether or not to render verbose errors
     * @return {string}
     */
    toString(verbose) {
        let output = `${chalk.yellow('Message:')} ${this.message}\n`;

        if (verbose) {
            output += `${chalk.yellow('Stack:')} ${this.stack}\n`;
        }

        return output;
    }
}

/**
 * Process Error class. Used for handling errors of running shell commands (normally through execa)
 */
class ProcessError extends CliError {
    toString(verbose) {
        let output = chalk.red(`Error occurred running command: '${this.options.cmd}'\n\n`);

        if (this.options.killed) {
            // Process was killed
            output += chalk.yellow(
                'Process was killed, meaning your system ran out of memory.\n' +
                'You should either increase the amount of RAM in your system, or add swap space.\n\n'
            );
        } else if (this.options.code) {
            output += chalk.yellow(`Exit code: ${this.options.code}\n\n`);
        }

        if (verbose && this.options.stdout) {
            output += chalk.grey('--------------- stdout ---------------\n') +
                `${this.options.stdout}\n\n` +
                chalk.grey('--------------- stderr ---------------\n') +
                `${this.options.stderr}\n`;
        }

        return output;
    }
}

/**
 * Error class for handling errors specifically coming from Ghost itself.
 * Currently doesn't do anything outside of the normal CliError class, but
 * will be fleshed out more in the future
 */
class GhostError extends CliError {}

/**
 * Handles all errors resulting from system issues
 */
class SystemError extends CliError {
    logToFile() {
        return false;
    }

    // We don't need to include the stack in this error class
    toString() {
        return super.toString(false);
    }
}

/**
 * Error thrown whenever an error is because of a user misconfiguration
 */
class ConfigError extends CliError {
    logToFile() {
        // Because it's a user config issue, we don't need to log it to a file
        return false;
    }

    toString() {
        let initial = chalk.red(`Error detected in the ${this.options.environment} configuration.\n\n`) +
            `${chalk.gray('Message:')} ${this.options.message}\n`;

        if (this.options.configKey) {
            initial += `${chalk.gray('Configuration Key:')} ${this.options.configKey}\n` +
                `${chalk.gray('Current Value:')} ${this.options.configValue}\n\n` +
                chalk.blue(`Run \`${chalk.underline(`ghost config ${this.options.configKey} <new value>`)}\` to fix it.\n`);
        }

        return initial;
    }
}

module.exports = {
    CliError: CliError,
    ProcessError: ProcessError,
    GhostError: GhostError,
    SystemError: SystemError,
    ConfigError: ConfigError
};
