var BaseTask = require('./base'),
    npm = require('../utils/npm');

module.exports = BaseTask.extend({
    name: 'npm-install',
    description: 'Installing npm dependencies',

    run: function run(options) {
        var currentDir = process.cwd(),
            originalStdout;

        if (options.cwd) {
            process.chdir(options.cwd);
        }

        // TODO: npm ignores loglevel when outputting the tree data
        // at the end of an install command. Because of this, there is
        // no way to suppress the output short of forking. We need to
        // evaluate and see if this is worth the added complexity to block
        // the output.
        return npm('install', [], {
            production: true,
            loglevel: 'error'
        }).then(function afterInstall() {
            process.stdout = originalStdout;
            process.chdir(currentDir);
        });
    }
});
