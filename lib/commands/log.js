'use strict';
const path = require('path');
const includes = require('lodash/includes');
const sliceFile = require('slice-file');
const PrettyStream = require('ghost-ignition/lib/logging/PrettyStream');

const errors = require('../errors');
const Command = require('../command');
const Config = require('../utils/config');

class LogCommand extends Command {
    run(argv) {
        let instance = Config.load('system').get(`instances.${argv.name}`, null);

        if (!instance) {
            return Promise.reject(new errors.SystemError(`Ghost instance '${argv.name}' does not exist`));
        }

        // Change into the cwd of the running ghost instance so we can do things
        // relative to that
        process.chdir(instance.cwd);

        let instanceConfig = Config.load(instance.mode);

        // Check if logging file transport is set in config
        if (!includes(instanceConfig.get('logging.transports', []), 'file')) {
            // TODO: fallback to process manager log retrieval?
            return Promise.reject(new errors.ConfigError({
                configKey: 'logging.transports',
                configValue: instanceConfig.get('logging.transports').join(', '),
                message: 'You have excluded file logging in your ghost config.' +
                    'Please add it to your transport config to use this command.',
                environment: instance.mode
            }));
        }

        let logFileName = path.join(process.cwd(), 'content/logs', `${instanceConfig.get('url').replace(/[^\w]/gi, '_')}_${instance.mode}.log`);
        let slice = sliceFile(logFileName);
        let prettyStream = new PrettyStream();

        prettyStream.on('error', (error) => {
            if (!(error instanceof SyntaxError)) {
                throw error;
            }
        });

        prettyStream.pipe(this.ui.stdout);

        if (argv.follow) {
            slice.follow(-argv.number).pipe(prettyStream);
            return;
        } else {
            slice.slice(-argv.number).pipe(prettyStream);
        }
    }
}

LogCommand.description = 'View logs of a running Ghost process';
LogCommand.params = '<name>';
LogCommand.options = {
    number: {
        alias: 'n',
        description: 'Number of lines to view',
        default: 20,
        type: 'number'
    },
    follow: {
        alias: 'f',
        description: 'Follow the log file (similar to `tail -f`)',
        type: 'boolean'
    }
};
LogCommand.global = true;

module.exports = LogCommand;
