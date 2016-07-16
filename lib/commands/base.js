var forEach = require('lodash/forEach'),
    isObject = require('lodash/isObject'),
    isFunction = require('lodash/isFunction'),
    CoreObject = require('core-object');

module.exports = CoreObject.extend({
    name: '',
    description: '',
    arguments: [],
    options: [],

    init: function (program) {
        this._super();

        var thisCommand;

        this.program = program;

        thisCommand = program.command(this._buildArguments());

        thisCommand.description(this.description);
        this._addOptions(thisCommand);

        thisCommand.action(this.execute);

        if (this.help && isFunction(this.help)) {
            thisCommand.on('--help', this.help);
        }
    },

    _buildArguments: function () {
        var cmdString = this.name,
            args = this.arguments;

        // each element in the arguments array can either be a string
        // or an object, objects can specify whether the argument is
        // optional or variadic
        forEach(args, function (arg) {
            if (isObject(arg) && (arg.optional || arg.variadic)) {
                cmdString += ' [' + arg.name + ((arg.variadic) ? '...' : '') + ']';
                return;
            }

            cmdString += ' <' + (isObject(arg) ? arg.name : arg) + '>';
        });

        return cmdString;
    },

    _addOptions: function (command) {
        forEach(this.options, function (option) {
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

            if (option.description) {
                args.push(option.description);
            }

            if (option.filter && isFunction(option.filter)) {
                args.push(option.filter);

                if (option.filterArgs) {
                    args.push(option.filterArgs);
                }
            }

            command.option.apply(command, args);
        });
    },

    execute: function () {}
});
