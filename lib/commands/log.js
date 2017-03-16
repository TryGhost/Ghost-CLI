'use strict';
const path = require('path');
const includes = require('lodash/includes');
const sliceFile = require('slice-file');
const PrettyStream = require('ghost-ignition/lib/logging/PrettyStream');

const errors = require('../errors');
const Config = require('../utils/config');

module.exports.execute = function execute(name, options) {
    let systemConfig = Config.load('system');
    let instance = systemConfig.get(`instances.${name}`);

    if (!instance) {
        return Promise.reject(new errors.SystemError(`Ghost instance '${name}' does not exist`));
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
        return;
    }

    let logFileName = path.join(process.cwd(), 'content/logs', `${instance.url.replace(/[^\w]/gi, '_')}_${instance.mode}.log`);
    let slice = sliceFile(logFileName);
    let prettyStream = new PrettyStream();

    prettyStream.on('error', (error) => {
        if (!(error instanceof SyntaxError)) {
            throw error;
        }
    });

    prettyStream.pipe(this.ui.stdout);

    if (options.follow) {
        slice.follow(-options.number).pipe(prettyStream);
        return;
    } else {
        slice.slice(-options.number).pipe(prettyStream);
    }
};
