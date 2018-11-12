/*
 * Inspired by the Denali-CLI command class
 * https://github.com/denali-js/denali-cli/blob/master/lib/command.ts
 */
'use strict';

const each = require('lodash/each');
const createDebug = require('debug');
const kebabCase = require('lodash/kebabCase');

const UI = require('./ui');
const System = require('./system');

const debug = createDebug('ghost-cli:command');

/**
 * Base Command class. All commands, both internal and external,
 * MUST extend this class
 *
 * @class Command
 */
class Command {
    /**
     * Configures the args/options for this command
     *
     * @param {String} commandName
     * @param {Array<String>} aliases Aliases from abbrev
     * @param {Yargs} yargs Yargs instance
     * @param {Array} extensions Array of discovered extensions
     * @return {Yargs} Yargs instance after command has been called
     *
     * @static
     * @method configure
     * @private
     */
    static configure(commandName, aliases, yargs, extensions) {
        if (!this.description) {
            throw new Error(`Command ${commandName} must have a description!`);
        }

        debug(`adding configuration for ${commandName}`);

        let command = commandName;
        if (this.params) {
            command += ` ${this.params}`;
        }

        return yargs.command({
            command: command,
            aliases: aliases,
            describe: this.description,
            builder: (commandArgs) => {
                debug(`building options for ${commandName}`);
                commandArgs = this.configureOptions(commandName, commandArgs, extensions);
                if (this.configureSubcommands) {
                    commandArgs = this.configureSubcommands(commandName, commandArgs, extensions);
                }
                return commandArgs;
            },

            handler: (argv) => {
                this._run(commandName, argv, extensions);
            }
        });
    }

    /**
     * Configure Yargs for this command. Subclasses can override this to do anything
     * specific that they need to do at config time
     *
     * @param {String} commandName Name of the command
     * @param {Yargs} yargs Yargs instance
     * @param {Array} extensions Array of discovered extensions
     * @return {Yargs} Yargs instance after options are configured
     *
     * @static
     * @method configureOptions
     * @public
     */
    static configureOptions(commandName, yargs, extensions, onlyOptions) {
        each(this.options || {}, (option, optionName) => {
            yargs = yargs.option(kebabCase(optionName), option);
        });

        if (onlyOptions) {
            return yargs;
        }

        if (this.longDescription) {
            yargs.usage(this.longDescription);
        }

        yargs.epilogue('For more information, see our docs at https://docs.ghost.org/api/ghost-cli/');

        return yargs;
    }

    /**
     * Actually runs the command
     *
     * @param {String} commandName Command Name
     * @param {Object} argv Parsed arguments
     * @param {Array} extensions Array of discovered extensions
     * @param {Object} context Various contextual dependencies
     *
     * @static
     * @method run
     * @private
     */
    static _run(commandName, argv = {}, extensions) {
        debug('running command prep');
        // Set process title
        process.title = `ghost ${commandName}`;

        // Create CLI-wide UI & System instances
        const ui = new UI({
            verbose: argv.verbose,
            allowPrompt: argv.prompt,
            auto: argv.auto
        });

        // This needs to run before the installation check
        if (argv.dir) {
            debug('Directory specified, attempting to update');
            const path = require('path');
            const dir = path.resolve(argv.dir);
            try {
                if (this.ensureDir) {
                    const {ensureDirSync} = require('fs-extra');
                    ensureDirSync(dir);
                }

                process.chdir(dir);
            } catch (error) {
                /* istanbul ignore next */
                const err = error.message || error.code || error;
                ui.log(`Unable to use "${dir}" (error ${err}). Create the directory and try again.`, 'red', true);
                process.exit(1);
            }

            debug('Finished updating directory');
        }

        if (!this.global) {
            const checkValidInstall = require('./utils/check-valid-install');

            checkValidInstall(commandName);
        }

        if (!this.allowRoot) {
            const checkRootUser = require('./utils/check-root-user');
            // Check if user is trying to install as `root`
            checkRootUser(commandName);
        }

        const system = new System(ui, extensions);

        // Set the initial environment based on args or NODE_ENV
        system.setEnvironment(argv.development || process.env.NODE_ENV === 'development', true);

        // Instantiate the Command class
        const commandInstance = new this(ui, system);

        // Bind cleanup handler if one exists
        if (commandInstance.cleanup) {
            debug(`cleanup handler found for ${commandName}`);
            const cleanup = commandInstance.cleanup.bind(commandInstance);
            // process.on('exit') is unreliable apparently, so we do this
            process.removeAllListeners('SIGINT').on('SIGINT', cleanup)
                .removeAllListeners('SIGTERM').on('SIGTERM', cleanup);
        }

        let precheck = Promise.resolve();

        if (this.runPreChecks) {
            const preChecks = require('./utils/pre-checks');
            precheck = preChecks(ui, system);
        }

        return precheck.then(() => {
            // Run ze command
            debug(`running command ${commandName}`);
            return Promise.resolve(commandInstance.run(argv));
        }).catch((error) => {
            debug(`command ${commandName} failed!`);

            // Handle an error
            ui.error(error, system);

            process.exit(1);
        });
    }

    /**
     * Constructs the command instance
     *
     * @param {UI} ui UI instance
     * @param {System} system System instance
     */
    constructor(ui, system) {
        this.ui = ui;
        this.system = system;
    }

    /**
     * @param {Object} argv Parsed arguments object
     * @return Promise<void>|any
     * @method run
     * @public
     */
    run() {
        throw new Error('Command must implement run function');
    }

    /**
     * @param {Command} CommandClass Class of command to run
     * @param {Object} argv Parsed arguments
     * @return Promise<void>
     * @method runCommand
     * @public
     */
    runCommand(CommandClass, argv) {
        if (!(CommandClass.prototype instanceof Command)) {
            return Promise.reject(new Error('Provided command class does not extend the Command class'));
        }

        const cmdInstance = new CommandClass(this.ui, this.system);
        return Promise.resolve(cmdInstance.run(argv || {}));
    }
}

module.exports = Command;
