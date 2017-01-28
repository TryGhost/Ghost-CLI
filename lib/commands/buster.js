'use strict';
const npm = require('../utils/npm');

module.exports.execute = function execute() {
    return this.ui.run(npm(['cache', 'clean']), 'Clearing npm cache');
};
