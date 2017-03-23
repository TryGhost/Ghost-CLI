'use strict';
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const each = require('lodash/each');
const Config = require('../utils/config');

module.exports.execute = function execute() {
    let systemConfig = Config.load('system');
    let rows = [];
    let instances = systemConfig.get('instances', {});
    let save = false;

    each(instances, (instance, name) => {
        if (!fs.existsSync(path.join(instance.cwd, '.ghost-cli'))) {
            // install has been removed, so we want to remove it from the list
            delete instances[name];
            save = true;
            return;
        }

        if (!instance.mode) {
            rows.push([name, instance.cwd, chalk.red('stopped'), chalk.red('n/a'), chalk.red('n/a'), chalk.red('n/a')]);
            return;
        }

        let instanceConfig = Config.load(path.join(instance.cwd, `config.${instance.mode}.json`));
        rows.push([name, instance.cwd, `${chalk.green('running')} (${instance.mode})`, instanceConfig.get('url'), instanceConfig.get('server.port'), instanceConfig.get('process')]);
    });

    if (save) {
        // There have been instances removed, re-save the instance list
        systemConfig.save();
    }

    this.ui.table(['Name', 'Location', 'Status', 'Url', 'Port', 'Process Manager'], rows, {
        style: {head: ['cyan']}
    });
};
