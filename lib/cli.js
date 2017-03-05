'use strict';
const _           = require('lodash');
const UI          = require('./ui');
const pkg         = require('../package');
const chalk       = require('chalk');
const createDebug = require('debug');
const ServiceManager = require('./services');

const debug = createDebug('ghost-cli:main');

function buildArguments(args, name) {
    // each element in the arguments array can either be a string
    // or an object, objects can specify whether the argument is
    // optional or variadic
    _.each(args || [], (arg) => {
        if (_.isObject(arg) && (arg.optional || arg.variadic)) {
            name += ` [${arg.name + ((arg.variadic) ? '...' : '')}]`;
            return;
        }

        name += ` <${(_.isObject(arg) ? arg.name : arg)}>`;
    });

    debug(`generated command arg list: '${name}'`);
    return name;
}

function addOptions(options, commander) {
    _.each(options || [], (option) => {
        var args = [],
            optString = '';

        if (option.alias) {
            optString += `-${option.alias}, `;
        }

        optString += '--' + option.name;

        if (!option.flag) {
            if (option.signature) {
                optString += ` ${option.signature}`;
            } else if (option.optional) {
                optString += ' [value]';
            } else {
                optString += ' <value>';
            }
        }

        args.push(optString);

        args.push(option.description || '');

        if (option.filter && (_.isFunction(option.filter) || _.isRegExp(option.filter))) {
            args.push(option.filter);
        }

        if (option.defaultValue) {
            args.push(option.defaultValue);
        }
        debug(`adding command option: '${option.name}' with config: ${args.join(',')}`);
        commander.option.apply(commander, args);
    });
}

function loadCommands(commands, program) {
    let commandObjects = {};

    _.each(commands, (meta, name) => {
        debug(`building command: '${name}'`);
        let commander = program.command(buildArguments(meta.arguments, name));

        if (meta.description) {commander.description(meta.description);}
        if (meta.alias) {commander.alias(meta.alias);}

        debug(`adding options for ${name}`);
        addOptions(meta.options, commander);

        commander.action(function wrapCommand() {
            debug(`running command '${name}'`);

            process.title = `ghost ${name}`;
            const command = require(`./commands/${name}`);
            let options = _.last(arguments);

            let ui = new UI({
                verbose: options.parent.verbose
            });
            let service = ServiceManager.load(ui);
            let context = {
                ui: ui,
                service: service,
                renderer: 'update'
            };

            if (options.parent.verbose) {
                context.renderer = 'verbose';
                context.verbose = true;
            }

            context.development = (process.env.NODE_ENV === 'development') || options.parent.development;
            context.environment = context.development ? 'development' : 'production';

            // Set NODE_ENV so it's accessible everywhere
            process.env.NODE_ENV = context.environment;

            if (command.exit && _.isFunction(command.exit)) {
                debug(`exit handler found for '${name}', binding exit events`);
                // process.on('exit') is unreliable apparently, so we do this
                process.removeAllListeners('SIGINT').on('SIGINT', command.exit)
                    .removeAllListeners('SIGTERM').on('SIGTERM', command.exit);
            }

            debug('calling command execution method');
            return Promise.resolve(command.execute.apply(context, arguments)).catch((error) => {
                debug('command execution failed');
                ui.error(error, {
                    context: context,
                    args: options.parent.rawArgs.slice(2),
                    cliVersion: pkg.version
                });
            });
        });

        commandObjects[name] = commander;
    });

    return commandObjects;
}

function cli(args, program) {
    debug('ghost-cli started');
    program.version(pkg.version, '-v, --version');

    let commands = require('./commands');
    debug('loading commands');
    let commandObjects = loadCommands(commands, program);

    program.command('help [command]')
        .description('Output help information for a command')
        .action(function helpCommand(command) {
            // If command isn't specified or doesn't exist,
            // output help information
            if (!command || !commandObjects[command]) {
                return program.help();
            }

            // output help information for the particular command
            commandObjects[command].help();
        });

    program.option('-V, --verbose', 'Enable verbose output');
    program.option('-D, --development', 'Run in development mode');

    debug('commands loaded, executing program');
    program.parse(args);

    if (!program.args.length) {
        // If user doesn't actually type a command,
        // output the help information
        program.help();
    } else if (program.args.length === 1 && !_.isObject(program.args[0])) {
        // if command is invalid, output error and exit.
        console.error(chalk.red('Command \'' + program.args[0] + '\' not found! Type `ghost help` for usage.'));
        process.exit(1);
    }
}

module.exports = cli;
