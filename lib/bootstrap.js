'use strict';
const fs = require('fs-extra');
const each = require('lodash/each');
const path = require('path');
const abbrev = require('abbrev');
const createDebug = require('debug');
const Command = require('./command');

const debug = createDebug('ghost-cli:bootstrap');

function discoverCommands(commands, dir, extensionName) {
    let commandsDir = path.join(dir, 'commands');

    if (!fs.existsSync(commandsDir)) {
        return commands;
    }

    fs.readdirSync(commandsDir).filter((command) => {
        return path.extname(command) === '.js' || fs.existsSync(path.join(commandsDir, command, 'index.js'));
    }).forEach((command) => {
        let basename = path.basename(command, '.js');
        let commandName = commands[basename] ? `${ extensionName }:${ basename }` : basename;
        commands[commandName] = path.resolve(commandsDir, basename);
    });

    return commands;
}

process.on('unhandledRejection', (reason, promise) => {
    console.warn('A promise was rejected but did not have a .catch() handler:');
    console.warn(reason && reason.stack || reason || promise);
    throw reason;
});

module.exports = {
    discoverCommands: discoverCommands,
    run: function run(argv, yargs) {
        if (argv.length === 0) {
            console.error('No command specified. Run `ghost help` for usage');
            process.exit(1);
        }

        debug('loading built-in commands');
        let commands = discoverCommands({}, __dirname);

        debug(`discovered commands: ${ Object.keys(commands).join(', ') }`);
        let abbreviations = abbrev(Object.keys(commands));
        let firstArg = argv.shift();

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
                CommandClass.configure(commandName, aliases, yargs, {});
                argv.unshift('help');
            });
        } else if (abbreviations[firstArg]) {
            let commandName = abbreviations[firstArg];
            let commandPath = commands[commandName];
            let CommandClass = require(commandPath);

            if (!(CommandClass.prototype instanceof Command)) {
                console.error(`Command class for ${ commandName } does not inherit from Ghost-CLI's command class.`);
                process.exit(1);
            }

            let aliases = Object.keys(abbreviations).filter((key) => abbreviations[key] === commandName);
            CommandClass.configure(commandName, aliases, yargs);
            argv.unshift(commandName);
        } else if (firstArg === '--version') {
            argv.unshift(firstArg);
        } else {
            console.error(`Unrecognized command: '${ firstArg }'. Run \`ghost help\` for usage.`);
            process.exit(1);
        }

        yargs.wrap(Math.min(100, yargs.terminalWidth()))
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
            .version()
            .help()
            .parse(argv);
    }
}
