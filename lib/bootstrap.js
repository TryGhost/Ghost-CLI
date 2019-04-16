'use strict';
const fs = require('fs-extra');
const each = require('lodash/each');
const path = require('path');
const abbrev = require('abbrev');
const createDebug = require('debug');
const Command = require('./command');
const findExtensions = require('./utils/find-extensions');

const debug = createDebug('ghost-cli:bootstrap');

// Extra alises for commands
const extraAliases = {
    '--version': 'version',
    '-v': 'version',
    busters: 'buster',
    intsall: 'install',
    insall: 'install',
    status: 'ls',
    upgrade: 'update',
    udpate: 'update'
};

// Ensure if any promises aren't handled correctly then they get logged
process.on('unhandledRejection', (reason, promise) => {
    console.warn('A promise was rejected but did not have a .catch() handler:');
    console.warn(reason && reason.stack || reason || promise);
    throw reason;
});

const bootstrap = {
    /**
     * Discovers any commands inside of an extension folder
     * If a command name conflict occurs, commands will be namespaced according to
     * the extension name, e.g. `ghost exname:commandname`
     *
     * @param {Object} commands Current commands hash
     * @param {string} dir Directory to look for commands in
     * @param {string} extensionName Name of extension
     * @return {Object} Object hash with any discovered commands added
     */
    discoverCommands: function discoverCommands(commands, dir, extensionName) {
        const commandsDir = path.join(dir, 'commands');

        // No commands here if commands dir doesn't exist
        if (!fs.existsSync(commandsDir)) {
            return commands;
        }

        // Read the directory and find the commands
        fs.readdirSync(commandsDir).filter(
            // Don't treat non-js files as commands, but also make sure any commands that are folders
            // with index.js files in them are loaded
            command => path.extname(command) === '.js' || fs.existsSync(path.join(commandsDir, command, 'index.js'))
        ).forEach((command) => {
            const basename = path.basename(command, '.js');
            const commandName = commands[basename] ? `${extensionName}:${basename}` : basename;
            commands[commandName] = path.resolve(commandsDir, basename);
        });

        return commands;
    },

    /**
     * Configure a single command
     *
     * @param {String} commandName name of command
     * @param {String} commandPath path to command file
     * @param {Yargs} yargs Yargs instance
     * @param {Array<String>} array of string aliases for command
     * @param {Array<Object>} array of extensions
     */
    loadCommand: function loadCommand(commandName, commandPath, yargs, aliases, extensions) {
        const CommandClass = require(commandPath);

        if (!(CommandClass.prototype instanceof Command)) {
            // This should only be thrown by extensions, not internal CLI commands,
            // but needs to be here nonetheless
            console.error(`Command class for ${commandName} does not inherit from Ghost-CLI's command class.`);
            return;
        }

        // Configure the command
        CommandClass.configure(commandName, aliases, yargs, extensions);
    },

    /**
     * Runs the CLI!
     * This is where the magic happens
     *
     * @param {Array} Array of string arguments (taken from process.argv)
     * @param Yargs yargs instance
     */
    run: function run(argv, yargs) {
        debug('Starting bootstrap process');
        // Look for any available extensions, including ones built-in to the CLI itself
        const extensions = findExtensions();
        debug(`Found ${extensions.length} extensions: ${extensions.map(({pkg}) => pkg.name).join(', ')}`);

        debug('loading built-in commands');
        // Load built-in commands first
        let commands = bootstrap.discoverCommands({}, __dirname);

        debug('loading commands from extensions');
        // Then load commands from extensions
        extensions.forEach((extension) => {
            commands = bootstrap.discoverCommands(commands, extension.dir, extension.name);
        });

        debug(`discovered commands: ${Object.keys(commands).join(', ')}`);
        // Use abbrev to handle shortnened command names
        let abbreviations = abbrev(Object.keys(commands));
        // Get the first argument so we can not load all the commands at once
        const firstArg = argv.shift();

        // Apply extra aliases
        abbreviations = Object.assign(abbreviations, extraAliases);

        // Special-case `help` because we only want to configure all the commands
        // for this one case
        if (firstArg === 'help' || firstArg === '--help') {
            debug('running help command, requiring and configuring every command');

            each(commands, (commandPath, commandName) => {
                // Don't fetch aliases for help commands to keep the output clean.
                bootstrap.loadCommand(commandName, commandPath, yargs, [], extensions);
            });
            argv.unshift('help');
        } else if (abbreviations[firstArg]) {
            // Command found, instantiate/configure it and run!
            const commandName = abbreviations[firstArg];
            const commandPath = commands[commandName];
            // Get aliases of the command (so it will show up in yargs help)
            const aliases = Object.keys(abbreviations).filter(key => abbreviations[key] === commandName);
            bootstrap.loadCommand(commandName, commandPath, yargs, aliases, extensions);
            // Put the first arg back into the array
            argv.unshift(commandName);
        } else {
            // Command not found :( Error and exit
            console.error(`Unrecognized command: '${firstArg}'. Run \`ghost help\` for usage.`);
            process.exit(1);
        }

        // Yargs magic
        yargs.wrap(Math.min(150, yargs.terminalWidth()))
            .epilogue('For more information, see our docs at https://docs.ghost.org/api/ghost-cli/')
            .group('help', 'Global Options:')
            .option('d', {
                alias: 'dir',
                describe: 'Folder to run command in',
                group: 'Global Options:'
            }).option('D', {
                alias: 'development',
                describe: 'Run in development mode',
                type: 'boolean',
                group: 'Global Options:'
            })
            .option('V', {
                alias: 'verbose',
                describe: 'Enable verbose output',
                type: 'boolean',
                group: 'Global Options:'
            })
            .options('prompt', {
                describe: '[--no-prompt] Allow/Disallow UI prompting',
                type: 'boolean',
                default: true,
                group: 'Global Options:'
            })
            .option('color', {
                describe: '[--no-color] Allow/Disallow colorful logging',
                type: 'boolean',
                default: true,
                group: 'Global Options:'
            })
            .option('auto', {
                describe: 'Automatically run as much as possible',
                type: 'boolean',
                default: false,
                group: 'Global Options:'
            })
            .version(false)
            .parse(argv);
    }
};

module.exports = bootstrap;
