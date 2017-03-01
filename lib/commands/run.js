'use strict';
const path = require('path');

const Config = require('../utils/config');
const Instance = require('../utils/instance');
const checkValidInstall     = require('../utils/check-valid-install');

let instance;

module.exports.execute = function execute() {
    checkValidInstall('run');

    process.env.paths__contentPath = path.join(process.cwd(), 'content');

    this.service.setConfig(Config.load(this.environment));

    instance = new Instance(this.ui, this.service.process);
};

module.exports.exit = function exit() {
    if (instance) {
        instance.kill();
    }
};
