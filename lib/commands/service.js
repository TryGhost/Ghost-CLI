'use strict';
const Command = require('../command');

class ServiceCommand extends Command {
    run(argv) {
        let instance = this.system.getInstance();
        instance.loadConfig(true);

        this.service.setConfig(instance.config);

        return this.service.callCommand(argv.command, argv.args || []);
    }
}

ServiceCommand.description = 'Run a service-defined command';
ServiceCommand.params = '<command> [args..]';

module.exports = ServiceCommand;
