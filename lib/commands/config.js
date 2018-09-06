'use strict';
const Command = require('../command');
const options = require('../tasks/configure/options');

class ConfigCommand extends Command {
    static configureSubcommands(commandName, commandArgs, extensions) {
        return commandArgs.command({
            command: 'get <key>',
            describe: 'Get a specific value from the configuration file',
            handler: argv => this._run(`${commandName} get`, argv, extensions)
        }).command({
            command: 'set <key> <value>',
            describe: 'Set a specific value in the configuration file',
            handler: argv => this._run(`${commandName} set`, argv, extensions)
        });
    }

    constructor(ui, system) {
        super(ui, system);

        this.instance = this.system.getInstance();
    }

    run(argv) {
        const {key, value} = argv;

        this.instance.checkEnvironment();

        if (key && !value) {
            // getter
            if (this.instance.config.has(key)) {
                this.ui.log(this.instance.config.get(key));
            }

            return Promise.resolve();
        } else if (key) {
            // setter
            this.instance.config.set(key, value).save();
            this.ui.log(`Successfully set '${key}' to '${value}'`, 'green');
            return Promise.resolve();
        }

        const configure = require('../tasks/configure');
        return configure(this.ui, this.instance.config, argv, this.system.environment, false);
    }
}

ConfigCommand.description = 'View or edit Ghost configuration';
ConfigCommand.longDescription = '$0 config [key] [value]\n View or modify the configuration for a Ghost instance.';
ConfigCommand.params = '[key] [value]';
ConfigCommand.options = options;

module.exports = ConfigCommand;
