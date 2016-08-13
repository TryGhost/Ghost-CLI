var BaseTask = require('./base'),
    npm = require('../utils/npm');

module.exports = BaseTask.extend({
    name: 'npm-install',
    description: 'Installing npm dependencies',

    run: function run(options) {
        options = options || {};

        return npm(['install', '--production'], {
            loglevel: 'error'
        }, {
            cwd: options.cwd || process.cwd()
        });
    }
});
