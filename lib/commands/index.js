var each = require('lodash/each'),
    isFunction = require('lodash/isFunction'),
    isRegExp = require('lodash/isRegExp'),
    isObject = require('lodash/isObject'),
    commands = [
        require('./buster'),
        require('./config'),
        require('./doctor'),
        require('./install'),
        require('./run'),
        require('./setup'),
        require('./start'),
        require('./stop'),
        require('./update')
    ];

function buildArguments(command) {
    var cmdString = command.name,
        args = command.arguments || [];

    // each element in the arguments array can either be a string
    // or an object, objects can specify whether the argument is
    // optional or variadic
    each(args, function eachArg(arg) {
        if (isObject(arg) && (arg.optional || arg.variadic)) {
            cmdString += ' [' + arg.name + ((arg.variadic) ? '...' : '') + ']';
            return;
        }

        cmdString += ' <' + (isObject(arg) ? arg.name : arg) + '>';
    });

    return cmdString;
}

function addOptions(cmd, commander) {
    each(cmd.options || [], function eachOpt(option) {
        var args = [],
            optString = '';

        if (option.alias) {
            optString += '-' + option.alias + ', ';
        }

        optString += '--' + option.name;

        if (!option.flag) {
            if (option.signature) {
                optString += ' ' + option.signature;
            } else if (option.optional) {
                optString += ' [value]';
            } else {
                optString += ' <value>';
            }
        }

        args.push(optString);

        args.push(option.description || '');

        if (option.filter && (isFunction(option.filter) || isRegExp(option.filter))) {
            args.push(option.filter);
        }

        if (option.defaultValue) {
            args.push(option.defaultValue);
        }

        commander.option.apply(commander, args);
    });
}

function loadCommands(program) {
    var Promise = require('bluebird'),
        reduce = require('lodash/reduce');

    return reduce(commands, function (namedCommands, command) {
        var commander = program.command(buildArguments(command));

        commander.description(command.description);
        addOptions(command, commander);

        commander.action(function wrapCommand() {
            var last = require('lodash/last'),
                isFunction = require('lodash/isFunction'),
                options = last(arguments),
                Command = command.Command,
                cmdInstance = new Command(),
                exit;

            if (options.parent.verbose) {
                cmdInstance.ui.setVerbosity(true);
            }

            if (cmdInstance.exit && isFunction(cmdInstance.exit)) {
                exit = cmdInstance.exit.bind(cmdInstance);

                // process.on('exit') is unreliable apparently, so we do this
                process.removeAllListeners('SIGINT').on('SIGINT', exit)
                    .removeAllListeners('SIGTERM').on('SIGTERM', exit);
            }

            return Promise.resolve(cmdInstance.execute.apply(cmdInstance, arguments))
                .then(function success() {
                    // TODO: better cleanup
                    cmdInstance.ui.success('Finished!');
                }).catch(function error(error) {
                    if (error instanceof Error) {
                        // TODO: better error handling
                        cmdInstance.ui.fail(error.message);
                    } else if (error) {
                        // @TODO: this is a temporary fix to avoid [object object] output
                        cmdInstance.ui.fail(JSON.stringify(error));
                    } else {
                        cmdInstance.ui.fail('Failed :(');
                    }
                });
        });

        namedCommands[command.name] = commander;

        return namedCommands;
    }, {});
}

module.exports = {
    loadCommands: loadCommands
};
