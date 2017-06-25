'use strict';
const Config = require('../utils/config');
const Command = require('../command');

class ServiceCommand extends Command {
    run(argv) {
        this.service.setConfig(Config.load(this.environment));

        return this.service.callCommand(argv.command, argv.args || []);
    }
}

ServiceCommand.description = 'Run a service-defined command';
ServiceCommand.params = '<command> [args..]';

module.exports = ServiceCommand;
