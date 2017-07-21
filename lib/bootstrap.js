'use strict';
const fs = require('fs-extra');
const each = require('lodash/each');
const path = require('path');
const abbrev = require('abbrev');
const createDebug = require('debug');
const Command = require('./command');
const findExtensions = require('./utils/find-extensions');

const debug = createDebug('ghost-cli:bootstrap');

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
function discoverCommands(commands, dir, extensionName) {
    let commandsDir = path.join(dir, 'commands');

    // No commands here if commands dir doesn't exist
    if (!fs.existsSync(commandsDir)) {
        return commands;
    }

    // Read the directory and find the commands
    fs.readdirSync(commandsDir).filter((command) => {
        // Don't treat non-js files as commands, but also make sure any commands that are folders
        // with index.js files in them are loaded
        return path.extname(command) === '.js' || fs.existsSync(path.join(commandsDir, command, 'index.js'));
    }).forEach((command) => {
        let basename = path.basename(command, '.js');
        let commandName = commands[basename] ? `${ extensionName }:${ basename }` : basename;
        commands[commandName] = path.resolve(commandsDir, basename);
    });

    return commands;
}

// Ensure if any promises aren't handled correctly then they get logged
process.on('unhandledRejection', (reason, promise) => {
    console.warn('A promise was rejected but did not have a .catch() handler:');
    console.warn(reason && reason.stack || reason || promise);
    throw reason;
});

module.exports = {
    // Exported for ease of unit testing
    discoverCommands: discoverCommands,

    /**
     * Runs the CLI!
     * This is where the magic happens
     *
     * @param {Array} Array of string arguments (taken from process.argv)
     * @param Yargs yargs instance
     */
    run: function run(argv, yargs) {
        if (argv.length === 0) {
            console.error('No command specified. Run `ghost help` for usage');
            process.exit(1);
        }

        // Look for any available extensions, including ones built-in to the CLI itself
        let extensions = findExtensions();
        debug(`Found ${ extensions.length } extensions: ${ extensions.map((ext) => ext.pkg.name).join(', ') }`);

        debug('loading built-in commands');
        // Load built-in commands first
        let commands = discoverCommands({}, __dirname);

        debug('loading commands from extensions');
        // Then load commands from extensions
        extensions.forEach((extension) => {
            commands = discoverCommands(commands, extension.dir, extension.name);
        });

        debug(`discovered commands: ${ Object.keys(commands).join(', ') }`);
        // Use abbrev to handle shortnened command names
        let abbreviations = abbrev(Object.keys(commands));
        // Get the first argument so we can not load all the commands at once
        let firstArg = argv.shift();

        // Special case these one because we want `--version`, `-v` and `version` to go to the same command
        abbreviations['--version'] = 'version';
        abbreviations['-v'] = 'version';

        // Special-case `help` because we only want to configure all the commands
        // for this one case
        if (firstArg === 'help' || firstArg === '--help') {
            debug('running help command, requiring and configuring every command');

            each(commands, (commandPath, commandName) => {
                let CommandClass = require(commandPath);

                if (!(CommandClass.prototype instanceof Command)) {
                    console.error(`Command class for ${ commandName } does not inherit from Ghost-CLI's command class.`);
                    return;
                }

                let aliases = Object.keys(abbreviations).filter((key) => abbreviations[key] === commandName);
                CommandClass.configure(commandName, aliases, yargs, extensions);
                argv.unshift('help');
            });
        } else if (abbreviations[firstArg]) {
            // Command found, instantiate/configure it and run!
            let commandName = abbreviations[firstArg];
            let commandPath = commands[commandName];
            let CommandClass = require(commandPath);

            if (!(CommandClass.prototype instanceof Command)) {
                // This should only be thrown by extensions, not internal CLI commands,
                // but needs to be here nonetheless
                console.error(`Command class for ${ commandName } does not inherit from Ghost-CLI's command class.`);
                process.exit(1);
            }

            // Get aliases of the command (so it will show up in yargs help)
            let aliases = Object.keys(abbreviations).filter((key) => abbreviations[key] === commandName);
            // Configure the command
            CommandClass.configure(commandName, aliases, yargs, extensions);
            // Put the first arg back into the array
            argv.unshift(commandName);
        } else {
            // Command not found :( Error and exit
            console.error(`Unrecognized command: '${ firstArg }'. Run \`ghost help\` for usage.`);
            process.exit(1);
        }

        // Yargs magic
        // TODO: evaluate if `wrap` is actually needed?
        yargs.wrap(Math.min(100, yargs.terminalWidth()))
            .epilogue('For more information, see our docs at https://docs.ghost.org/docs/ghost-cli')
            .option('D', {
                alias: 'development',
                describe: 'Run in development mode',
                type: 'boolean'
            })
            .option('V', {
                alias: 'verbose',
                describe: 'Enable verbose output',
                type: 'boolean'
            })
            .options('prompt', {
                describe: '[--no-prompt] Allow/Disallow UI prompting',
                type: 'boolean',
                default: true
            })
            .help()
            .parse(argv);
    }
}
