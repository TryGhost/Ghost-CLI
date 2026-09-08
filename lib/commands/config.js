'use strict';
const Command = require('../command');
const options = require('../tasks/configure/options');

// Maps a config path (e.g. `server.port`) to the option that manages it
const optionsByConfigPath = new Map(
    Object.entries(options).map(([name, option]) => [option.configPath || name, option])
);

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

    async run(argv) {
        const {key, value} = argv;

        this.instance.checkEnvironment();

        if (key && !value) {
            // getter
            if (this.instance.config.has(key)) {
                this.ui.log(this.instance.config.get(key));
            }

            return;
        } else if (key) {
            // setter
            const parsed = await this.parseValue(key, value);

            this.instance.config.set(key, parsed).save();
            this.ui.log(`Successfully set '${key}' to '${parsed}'`, 'green');

            // If the instance is running, we want to remind the user to restart
            // it so the new config can take effect. The isRunning check is only
            // a nicety, so if it fails, swallow the error for better UX.
            try {
                if (await this.instance.isRunning()) {
                    const chalk = require('chalk').default;
                    this.ui.log(
                        `Ghost is running. Don't forget to run ${chalk.cyan('ghost restart')} to reload the config!`
                    );
                }
            } catch {
                // no-op
            }

            return;
        }

        const configure = require('../tasks/configure');
        await configure(this.ui, this.instance.config, argv, this.system.environment, false);
    }

    async parseValue(key, value) {
        const option = optionsByConfigPath.get(key);

        if (!option) {
            return value;
        }

        const parsed = option.transform ? option.transform(value) : value;

        if (!option.validate) {
            return parsed;
        }

        const result = await option.validate(parsed);

        if (result !== true) {
            const {ConfigError} = require('../errors');
            throw new ConfigError({
                config: {[key]: parsed},
                message: result,
                environment: this.system.environment
            });
        }

        return parsed;
    }
}

ConfigCommand.description = 'View or edit Ghost configuration';
ConfigCommand.longDescription = '$0 config [key] [value]\n View or modify the configuration for a Ghost instance.';
ConfigCommand.params = '[key] [value]';
ConfigCommand.options = options;
ConfigCommand.allowRoot = true;

module.exports = ConfigCommand;
