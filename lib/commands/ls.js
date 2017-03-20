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

    each(instances, (dir, name) => {
        // TODO: this is here to make switching from the system config structure of ghost-cli < 1.0.0-alpha.15
        // to the system config structure of ghost-cli >= 1.0.0-alpha.15 a painless process
        // This should be removed before 1.0 final
        if (typeof dir !== 'string') {
            dir = dir.cwd;
            instances[name] = dir;
            save = true;
        }

        if (!fs.existsSync(path.join(dir, '.ghost-cli'))) {
            // install has been removed, so we want to remove it from the list
            delete instances[name];
            save = true;
            return;
        }

        let installConfig = Config.load(path.join(dir, '.ghost-cli'));
        let environment = installConfig.get('running', false);

        if (!environment) {
            rows.push([name, dir, chalk.red('stopped'), chalk.red('n/a'), chalk.red('n/a'), chalk.red('n/a')]);
            return;
        }

        let instanceConfig = Config.load(path.join(dir, `config.${environment}.json`));
        rows.push([name, dir, `${chalk.green('running')} (${environment})`, instanceConfig.get('url'), instanceConfig.get('server.port'), instanceConfig.get('process')]);
    });

    if (save) {
        // There have been instances removed, re-save the instance list
        systemConfig.save();
    }

    this.ui.table(['Name', 'Location', 'Status', 'Url', 'Port', 'Process Manager'], rows, {
        style: {head: ['cyan']}
    });
};
