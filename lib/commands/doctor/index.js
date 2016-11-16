var BaseCommand = require('../base');

module.exports = {
    name: 'doctor',
    description: 'check the system for any potential hiccups when installing/updating Ghost',

    arguments: [
        {name: 'category', optional: true}
    ]
};

module.exports.Command = BaseCommand.extend({
    execute: function execute(category) {
        var Promise = require('bluebird'),
            symbols = require('log-symbols'),
            eol = require('os').EOL,
            failed = false,
            self = this,
            check;

        category = category || 'install';

        try {
            check = require('./checks/' + category);
        } catch (e) {
            if (e.code === 'MODULE_NOT_FOUND') {
                this.ui.fail('Invalid category of checks');
                return Promise.reject();
            }

            return Promise.reject(e);
        }

        return Promise.each(check.checks, function (checkFn) {
            return Promise.resolve(checkFn()).then(function (result) {
                var msg = check.messages[checkFn.name];

                if (result === true) {
                    self.ui.success(symbols.success + ' ' + msg);
                    return;
                }

                self.ui.fail(symbols.error + ' ' + msg);

                if (result) {
                    self.ui.log(eol + result + eol);
                }

                failed = true;
            });
        }).then(function () {
            if (failed) {
                return Promise.reject();
            }
        });
    }
});
