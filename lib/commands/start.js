'use strict';
const fs = require('fs');
const path = require('path');

const Config = require('../utils/config');
const checkValidInstall     = require('../utils/check-valid-install');
const resolveProcessManager = require('../utils/resolve-process');

function register(config, environment) {
    let systemConfig = Config.load('system');
    let instances = systemConfig.get('instances', {});

    instances[config.get('pname')] = {
        mode: environment,
        cwd: process.cwd(),
        url: config.get('url'),
        port: config.get('server.port'),
        process: config.get('process')
    };
    systemConfig.set('instances', instances).save();
}

module.exports.execute = function execute(options) {
    checkValidInstall('start');

    options = options || {};

    // If we are starting in production mode but a development config exists and a production config doesn't,
    // we want to start in development mode anyways.
    if (!this.development && fs.existsSync(path.join(process.cwd(), 'config.development.json')) &&
            !fs.existsSync(path.join(process.cwd(), 'config.production.json'))) {
        this.ui.log('Found a development config but not a production config, starting in development mode instead.', 'yellow');
        this.development = false;
        process.NODE_ENV = this.environment = 'development';
    }

    let config = Config.load(`config.${this.environment}.json`);
    let cliConfig = Config.load('.ghost-cli');

    if (cliConfig.has('running')) {
        return Promise.reject(new Error('Ghost is already running.'));
    }

    let processManager = resolveProcessManager(config, this.ui);
    let start = Promise.resolve(processManager.start(process.cwd(), this.environment)).then(() => {
        register(config, this.environment);
        cliConfig.set('running', this.environment).save();
        // TODO: add process info to global cli file so Ghost-CLI is aware of this instance
        return Promise.resolve();
    });

    if (options.quiet) {
        return start;
    }

    return this.ui.run(start, 'Starting Ghost').then(() => {
        this.ui.log(`You can access your blog at ${config.get('url')}`, 'cyan');
    });
};
