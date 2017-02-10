'use strict';
const each = require('lodash/each');
const Config = require('../utils/config');

module.exports.execute = function execute() {
    let systemConfig = Config.load('system');
    let rows = [];
    let i = 1;

    each(systemConfig.get('instances', {}), (instance, cwd) => {
        rows.push([i, instance.url, instance.port, instance.mode, instance.process, cwd]);
        i += 1;
    });

    this.ui.table(['#', 'Url', 'Port', 'Environment', 'Process Manager', 'Location'], rows, {
        style: {head: ['cyan']}
    });
};
