'use strict';
const yarn = require('../utils/yarn');

module.exports.execute = function execute() {
    return this.ui.run(yarn(['cache', 'clean']), 'Clearing npm cache');
};
