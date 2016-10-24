var toArray = require('lodash/toArray'),
    CoreObject = require('core-object'),
    Promise = require('bluebird'),

    UI = require('../ui'),
    Config = require('../utils/config');

module.exports = CoreObject.extend({
    init: function (opts) {
        this._super();

        opts = opts || {};

        this.ui = opts.ui || new UI();
    },

    execute: function execute() {
        throw new Error('Command \'' + this.name + '\' must implement the execute method.');
    },

    runCommand: function runCommand(cmdName) {
        var Command = require('./' + cmdName).Command,
            cmdInstance = new Command({
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
        var path = require('path'),
            fs = require('fs-extra');

        if (fs.existsSync(path.join(process.cwd(), 'package.json')) &&
            fs.readJsonSync(path.join(process.cwd(), 'package.json')).name === 'ghost' &&
            fs.existsSync(path.join(process.cwd(), 'gulpfile.js'))) {
            console.error('Ghost-CLI commands do not work inside of a clone or direct download.\n' +
            'Perhaps you meant \'gulp ' + this.name + '\'?');
            process.exit(1);
        }

        if (!Config.exists(path.join(process.cwd(), '.ghost-cli'))) {
            console.error('Working directory is not a valid Ghost installation. Please run \'ghost ' +
            this.name + '\' again within a valid Ghost installation.');

            process.exit(1);
        }
    }
});
