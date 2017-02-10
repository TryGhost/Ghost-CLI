'use strict';
const Config = require('../utils/config');
const checkValidInstall     = require('../utils/check-valid-install');
const resolveProcessManager = require('../utils/resolve-process');

function register(config, environment) {
    let systemConfig = Config.load('system');
    let instances = systemConfig.get('instances', {});

    instances[process.cwd()] = {
        mode: environment,
        url: config.get('url'),
        port: config.get('server.port'),
        process: config.get('process')
    };
    systemConfig.set('instances', instances).save();
}

module.exports.execute = function execute(options) {
    checkValidInstall('start');

    options = options || {};

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
