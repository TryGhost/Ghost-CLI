var each = require('lodash/each'),
    isObject = require('lodash/isObject'),
    isRegExp = require('lodash/isRegExp'),
    toArray = require('lodash/toArray'),
    CoreObject = require('core-object'),
    isFunction = require('lodash/isFunction'),
    Promise = require('bluebird'),

    UI = require('../ui'),
    Config = require('../utils/config');

module.exports = CoreObject.extend({
    name: '',
    description: '',
    arguments: [],
    options: [],

    init: function (program, opts) {
        this._super();

        opts = opts || {};

        this.ui = opts.ui || new UI();

        // If program is not defined, then this is being called
        // as a subcommand, and therefore we shouldn't set up
        // all of the options/arguments required by commander
        if (program) {
            this.commander = program.command(this._buildArguments());

            this.commander.description(this.description);
            this._addOptions(this.commander);

            this.commander.action(this._wrapCommand());

            if (this.help && isFunction(this.help)) {
                this.commander.on('--help', this.help);
            }
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
            }).catch(function error(error) {
                if (error instanceof Error) {
                    // TODO: better error handling
                    self.ui.fail(error.message);
                } else if (error) {
                    // @TODO: this is a temporary fix to avoid [object object] output
                    self.ui.fail(JSON.stringify(error));
                } else {
                    self.ui.fail('Failed :(');
                }
            });
        };
    },

    execute: function execute() {
        throw new Error('Command \'' + this.name + '\' must implement the execute method.');
    },

    runCommand: function runCommand(cmdName) {
        var Command = require('./' + cmdName),
            cmdInstance = new Command(null, {
                ui: this.ui
            }),
            args = toArray(arguments).slice(1);

        return Promise.resolve(cmdInstance.execute.apply(cmdInstance, args));
    },

    runTask: function runTask(taskName, options, customDescription) {
        var Task = require('../tasks/' + taskName),
            taskInstance = new Task({
                ui: this.ui
            });

        return this.ui.run(
            taskInstance.run(options || {}),
            customDescription || taskInstance.description
        );
    },

    checkValidInstall: function checkValidInstall() {
        var path = require('path');

        if (!Config.exists(path.join(process.cwd(), '.ghost-cli'))) {
            console.error('Working directory is not a valid Ghost installation. Please run \'ghost ' +
            this.name + '\' again within a valid Ghost installation.');

            process.exit(1);
        }
    }
});
