'use strict';
const execa = require('execa');
const Promise = require('bluebird');

const Config = require('../utils/config');
const checkValidInstall     = require('../utils/check-valid-install');
const resolveProcessManager = require('../utils/resolve-process');

function stopAll() {
    let systemConfig = Config.load('system');
    let instances = systemConfig.get('instances', {});

    // Unlike lodash, bluebird doesn't support iterating over objects,
    // so we have to iterate over the keys and then get the url later
    return Promise.each(Object.keys(instances), (pname) => {
        let instance = instances[pname];
        return this.ui.run(execa('ghost', ['stop'], {
            cwd: instance.cwd,
            stdio: 'ignore'
        }), `Stopping Ghost: ${instance.url}`);
    });
}

function deregister(config) {
    let systemConfig = Config.load('system');
    let instances = systemConfig.get('instances', {});
    delete instances[config.get('pname')];
    systemConfig.set('instances', instances).save();
}

module.exports.execute = function execute(options) {
    options = options || {};

    if (options.all) {
        return stopAll.call(this);
    }

    checkValidInstall('stop');

    let cliConfig = Config.load('.ghost-cli');

    if (!cliConfig.has('running')) {
        return Promise.reject(new Error('No running Ghost instance found here.'));
    }

    let config = Config.load(`config.${cliConfig.get('running')}.json`);
    let processManager = resolveProcessManager(config, this.ui);
    let stop = Promise.resolve(processManager.stop(process.cwd())).then(() => {
        deregister(config);
        cliConfig.set('running', null).save();
        return Promise.resolve();
    });

    if (options.quiet) {
        return stop;
    }

    return this.ui.run(stop, 'Stopping Ghost');
};
