var each = require('lodash/each'),
    isObject = require('lodash/isObject'),
    isRegExp = require('lodash/isRegExp'),
    CoreObject = require('core-object'),
    isFunction = require('lodash/isFunction'),
    Promise = require('bluebird'),

    UI = require('../ui');

module.exports = CoreObject.extend({
    name: '',
    description: '',
    arguments: [],
    options: [],

    init: function (program) {
        this._super();

        var thisCommand;

        this.program = program;

        this.ui = new UI();

        thisCommand = program.command(this._buildArguments());

        thisCommand.description(this.description);
        this._addOptions(thisCommand);

        thisCommand.action(this._wrapCommand());

        if (this.help && isFunction(this.help)) {
            thisCommand.on('--help', this.help);
        }
    },

    _buildArguments: function _buildArguments() {
        var cmdString = this.name,
            args = this.arguments;

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
    },

    _addOptions: function _addOptions(command) {
        each(this.options, function eachOpt(option) {
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

            command.option.apply(command, args);
        });
    },

    _wrapCommand: function _wrapCommand() {
        var self = this;

        return function wrappedCommand() {
            return Promise.resolve(self.execute.apply(self, arguments)).then(function success() {
                // TODO: better cleanup
                self.ui.success('Finished!');
            }).catch(function error() {
                // TODO: better error handling
                self.ui.fail('Failed :(');
            });
        };
    },

    execute: function () {}
});
