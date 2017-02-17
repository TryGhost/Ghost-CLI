'use strict';
const Promise = require('bluebird');

const Config = require('../utils/config');
const ServiceManager = require('../services');
const checkValidInstall     = require('../utils/check-valid-install');

function stopAll() {
    let systemConfig = Config.load('system');
    let instances = systemConfig.get('instances', {});
    let cwd = process.cwd();

    // Unlike lodash, bluebird doesn't support iterating over objects,
    // so we have to iterate over the keys and then get the url later
    return Promise.each(Object.keys(instances), (pname) => {
        let instance = instances[pname];
        process.chdir(instance.cwd);
        return this.ui.run(execute.call(this, {quiet: true}), `Stopping Ghost: ${instance.url}`);
    }).then(() => {
        process.chdir(cwd);
    });
}

function deregister(config) {
    let systemConfig = Config.load('system');
    let instances = systemConfig.get('instances', {});
    delete instances[config.get('pname')];
    systemConfig.set('instances', instances).save();
}

function execute(options) {
    options = options || {};

    if (options.all) {
        return stopAll.call(this);
    }

    checkValidInstall('stop');

    let cliConfig = Config.load('.ghost-cli');

    if (!cliConfig.has('running')) {
        return Promise.reject(new Error('No running Ghost instance found here.'));
    }

    let config = Config.load(cliConfig.get('running'));
    this.serviceManager = this.serviceManager || ServiceManager.load(config, this.ui);
    let stop = Promise.resolve(this.serviceManager.process.stop(process.cwd())).then(() => {
        deregister(config);
        cliConfig.set('running', null).save();
        return Promise.resolve();
    });

    if (options.quiet) {
        return stop;
    }

    return this.ui.run(stop, 'Stopping Ghost');
};

module.exports.execute = execute;
