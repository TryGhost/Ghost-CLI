'use strict';
const each = require('lodash/each');
const Config = require('../utils/config');

module.exports.execute = function execute() {
    let systemConfig = Config.load('system');
    let rows = [];

    each(systemConfig.get('instances', {}), (instance, name) => {
        rows.push([name, instance.url, instance.port, instance.mode, instance.process, instance.cwd]);
    });

    this.ui.table(['Name', 'Url', 'Port', 'Environment', 'Process Manager', 'Location'], rows, {
        style: {head: ['cyan']}
    });
};
