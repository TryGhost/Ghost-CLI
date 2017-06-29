/*
 * Inspired by the Denali-CLI command class
 * https://github.com/denali-js/denali-cli/blob/master/lib/command.ts
 */
'use strict';

const fs = require('fs-extra');
const path = require('path');
const each = require('lodash/each');
const createDebug = require('debug');
const kebabCase = require('lodash/kebabCase');

const UI = require('./ui');
const System = require('./system');
const Config = require('./utils/config');

const debug = createDebug('ghost-cli:command');

function checkValidInstall(name) {
    if (fs.existsSync(path.join(process.cwd(), 'package.json')) &&
        fs.readJsonSync(path.join(process.cwd(), 'package.json')).name === 'ghost' &&
        fs.existsSync(path.join(process.cwd(), 'Gruntfile.js'))) {
        console.error('Ghost-CLI commands do not work inside of a clone or direct download.\n' +
        `Perhaps you meant 'grunt ${name}'?`);
        process.exit(1);
    }

    if (!Config.exists(path.join(process.cwd(), '.ghost-cli'))) {
        console.error('Working directory is not a valid Ghost installation. ' +
        `Please run 'ghost ${name}' again within a valid Ghost installation.`);

        process.exit(1);
    }
};

/**
 * Base Command class
 */
class Command {
    /**
     * Configures the args/options for this command
     *
     * @param {String} commandName
     * @param {Array<String>} aliases Aliases from abbrev
     * @param {Yargs} yargs Yargs instance
     */
    static configure(commandName, aliases, yargs, extensions) {
        if (!this.description) {
            throw new Error(`Command ${ commandName } must have a description!`);
        }

        debug(`adding configuration for ${ commandName }`);

        let command = commandName;
        if (this.params) {
            command += ` ${ this.params }`;
        }

        return yargs.command({
            command: command,
            aliases: aliases,
            describe: this.description,
            builder: (commandArgs) => {
                debug(`building options for ${ commandName }`);
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
     * Configure Yargs for this command
     *
     * @param {String} commandName Name of the command
     * @param {Yargs} yargs Yargs instance
     */
    static configureOptions(commandName, yargs) {
        if (this.longDescription) {
            yargs.usage(this.longDescription);
        }

        each(this.options || {}, (option, optionName) => {
            yargs = yargs.option(kebabCase(optionName), option);
        });

        return yargs;
    }

    /**
     *
     * @param {String} commandName Command Name
     * @param {Object} args Parsed arguments
     * @param {Object} context Various contextual dependencies
     */
    static _run(commandName, argv, extensions) {
        if (!this.global) {
            checkValidInstall(commandName);
        }

        process.title = `ghost ${ commandName }`;
        let verbose = argv.verbose;

        let ui = new UI({
            verbose: verbose,
            allowPrompt: argv.prompt
        });
        let system = new System(ui, extensions);

        system.setEnvironment(argv.development || process.env.NODE_ENV === 'development', true);
        let commandInstance = new this(ui, system);
        debug(`running command ${ commandName }`);

        if (commandInstance.cleanup) {
            debug(`cleanup handler found for ${ commandName }`);
            let cleanup = commandInstance.cleanup.bind(commandInstance);
            // process.on('exit') is unreliable apparently, so we do this
            process.removeAllListeners('SIGINT').on('SIGINT', cleanup)
                .removeAllListeners('SIGTERM').on('SIGTERM', cleanup);
        }

        return Promise.resolve(commandInstance.run(argv)).catch((error) => {
            debug(`command ${ commandName } failed!`);

            ui.error(error, system);

            process.exit(1);
        });
    }

    /**
     * Constructs the command instance
     */
    constructor(ui, system) {
        this.ui = ui;
        this.system = system;
    }

    /**
     * @param {Object} argv Parsed arguments object
     */
    run() {
        throw new Error('Command must implement run function');
    }

    runCommand(CommandClass, argv) {
        if (!(CommandClass.prototype instanceof Command)) {
            throw new Error('Provided command class does not extend the Command class');
        }

        let cmdInstance = new CommandClass(this.ui, this.system);
        return cmdInstance.run(argv || {});
    }
}

module.exports = Command;
module.exports.checkValidInstall = checkValidInstall;
