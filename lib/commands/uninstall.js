'use strict';
const fs = require('fs-extra');
const each = require('lodash/each');

const stop = require('./stop');
const Config = require('../utils/config');
const checkValidInstall = require('../utils/check-valid-install');

module.exports.execute = function execute() {
    checkValidInstall('uninstall');

    this.ui.log('WARNING: Running this command will delete all of your themes, images, data, and any files related to this ghost instance!\n' +
        'There is no going back!', 'yellow');

    return this.ui.prompt({
        type: 'confirm',
        name: 'sure',
        message: 'Are you sure you want to do this?',
        default: false
    }).then((answer) => {
        if (!answer.sure) {
            return Promise.reject(false);
        }

        let config = Config.load('.ghost-cli');

        if (!config.get('running', false)) {
            return Promise.resolve();
        }

        // If the instance is currently running we need to make
        // sure it gets stopped
        this.environment = config.get('running');
        return stop.execute.apply(this);
    }).then(() => {
        let config = Config.load(fs.existsSync('config.production.json') ? 'production' : 'development');
        this.service.setConfig(config);

        return this.ui.run(this.service.callHook('uninstall'), 'Removing related configuration');
    }).then(() => this.ui.run(() => {
        let systemConfig = Config.load('system');
        let instances = systemConfig.get('instances', {})
        each(instances, (instance, pname) => {
            if (instance.cwd === process.cwd()) {
                delete systemConfig[pname];
            }
        });
        systemConfig.set('instances', instances).save();

        return Promise.all(fs.readdirSync('.').map(file => fs.remove(file)));
    }, 'Removing Ghost installation'));
}
