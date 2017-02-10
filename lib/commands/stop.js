'use strict';
const Config = require('../utils/config');
const checkValidInstall     = require('../utils/check-valid-install');
const resolveProcessManager = require('../utils/resolve-process');

function deregister() {
    let systemConfig = Config.load('system');
    let instances = systemConfig.get('instances', {});
    delete instances[process.cwd()];
    systemConfig.set('instances', instances).save();
}

module.exports.execute = function execute(options) {
    checkValidInstall('stop');

    options = options || {};

    let cliConfig = Config.load('.ghost-cli');

    if (!cliConfig.has('running')) {
        return Promise.reject(new Error('No running Ghost instance found here.'));
    }

    let config = Config.load(`config.${cliConfig.get('running')}.json`);
    let processManager = resolveProcessManager(config, this.ui);
    let stop = Promise.resolve(processManager.stop(process.cwd())).then(() => {
        deregister();
        cliConfig.set('running', null).save();
        return Promise.resolve();
    });

    if (options.quiet) {
        return stop;
    }

    return this.ui.run(stop, 'Stopping Ghost');
};
