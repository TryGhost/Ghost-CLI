'use strict';
const Command = require('../command');

class LogCommand extends Command {
    run(argv) {
        const fs = require('fs');
        const path = require('path');
        const lastLines = require('read-last-lines');
        const checkValidInstall = require('../utils/check-valid-install');

        const errors = require('../errors');
        const PrettyStream = require('../ui/pretty-stream');

        if (!argv.name) {
            checkValidInstall('log');
        }

        const instance = this.system.getInstance(argv.name);

        if (!instance) {
            return Promise.reject(new errors.SystemError(`Ghost instance '${argv.name}' does not exist`));
        }

        return instance.running().then((running) => {
            if (!running) {
                instance.checkEnvironment();
            }

            // Check if logging file transport is set in config
            if (!instance.config.get('logging.transports', []).includes('file')) {
                // TODO: fallback to process manager log retrieval?
                return Promise.reject(new errors.ConfigError({
                    config: {
                        'logging.transports': instance.config.get('logging.transports').join(', ')
                    },
                    message: 'You have excluded file logging in your ghost config.' +
                        'You need to add it to your transport config to use this command.',
                    environment: this.system.environment
                }));
            }

            const logFileName = path.join(instance.dir, 'content/logs', `${instance.config.get('url').replace(/[^\w]/gi, '_')}_${this.system.environment}${argv.error ? '.error' : ''}.log`);
            const prettyStream = new PrettyStream();

            if (!fs.existsSync(logFileName)) {
                if (argv.follow) {
                    this.ui.log('Log file has not been created yet, `--follow` only works on existing files', 'yellow');
                }

                return Promise.resolve();
            }

            prettyStream.on('error', (error) => {
                if (!(error instanceof SyntaxError)) {
                    throw error;
                }
            });

            prettyStream.pipe(this.ui.stdout);

            return lastLines.read(logFileName, argv.number).then((lines) => {
                lines.trim().split('\n').forEach(line => prettyStream.write(line));

                if (argv.follow) {
                    const Tail = require('tail').Tail;

                    const tail = new Tail(logFileName);
                    tail.on('line', line => prettyStream.write(line, 'utf8'));
                }
            });
        });
    }
}

LogCommand.description = 'View the logs of a Ghost instance';
LogCommand.params = '[name]';
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
    },
    error: {
        alias: 'e',
        description: 'If provided, only show the error log',
        type: 'boolean'
    }
};
LogCommand.global = true;

module.exports = LogCommand;
