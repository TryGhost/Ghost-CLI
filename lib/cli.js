var pkg         = require('../package'),
    chalk       = require('chalk'),
    program     = require('commander'),
    isObject    = require('lodash/isObject'),

    commands    = require('./commands');

function cli(args) {
    program.version(pkg.version);

    var cmdInstances = commands.loadCommands(program);

    program.command('help [command]')
        .description('Output help information for a command')
        .action(function helpCommand(command) {
            // If command isn't specified or doesn't exist,
            // output help information
            if (!command || !cmdInstances[command]) {
                return program.help();
            }

            // output help information for the particular command
            cmdInstances[command].commander.help();
        });

    program.parse(args);

    if (!program.args.length) {
        // If user doesn't actually type a command,
        // output the help information
        program.help();
    } else if (program.args.length === 1 && !isObject(program.args[0])) {
        // if command is invalid, output error and exit.
        console.error(chalk.red('Command \'' + program.args[0] + '\' not found! Type `ghost help` for usage.'));
        process.exit(1);
    }
}

module.exports = cli;
