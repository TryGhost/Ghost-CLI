'use strict';
const Promise = require('bluebird');

const Config = require('../utils/config');
const errors = require('../errors');
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
        return this.ui.run(execute.call(this, {quiet: true}), `Stopping Ghost: ${pname}`);
    }).then(() => {
        process.chdir(cwd);
    });
}

function execute(options) {
    options = options || {};

    if (options.all) {
        return stopAll.call(this);
    }

    checkValidInstall('stop');

    let cliConfig = Config.load('.ghost-cli');

    if (!cliConfig.has('running')) {
        return Promise.reject(new errors.SystemError('No running Ghost instance found here.'));
    }

    let config = Config.load(cliConfig.get('running'));
    this.service.setConfig(config);
    let stop = () => Promise.resolve(this.service.process.stop(process.cwd())).then(() => {
        let systemConfig = Config.load('system');
        let instance = systemConfig.get(`instances.${config.get('pname')}`, {});
        delete instance.mode;
        systemConfig.save();

        cliConfig.set('running', null).save();
        return Promise.resolve();
    });

    if (options.quiet) {
        return stop();
    }

    return this.ui.run(stop, 'Stopping Ghost');
};

module.exports.execute = execute;
