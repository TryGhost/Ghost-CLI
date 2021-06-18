'use strict';

const cli = require('../../../lib/index');

module.exports = class TestProcess extends cli.ProcessManager {
    static willRun() {
        return true;
    }
};
