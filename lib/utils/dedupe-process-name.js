'use strict';
const uniqueId = require('lodash/uniqueId');
const includes = require('lodash/includes');
const Config = require('./config');

module.exports = function dedupeProcessName(config) {
    let systemConfig = Config.load('system');
    let existingProcessNames = Object.keys(systemConfig.get('instances'));
    let pname = config.get('pname');

    // Continue searching until we've found a new unique id
    while (includes(existingProcessNames, pname)) {
        pname = uniqueId(pname.endsWith('-') ? pname : `${pname}-`);
    }

    // If pname has changed, update the config
    if (pname !== config.get('pname')) {
        config.set('pname', pname).save();
    }
}
