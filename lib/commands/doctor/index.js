var BaseCommand = require('../base');

module.exports = {
    name: 'doctor',
    description: 'check the system for any potential hiccups when installing/updating Ghost',

    arguments: [
        {name: 'category', optional: true}
    ]
};

module.exports.Command = BaseCommand.extend({
    categories: {
        install: {
            nodeVersion: 'System is running supported version of node',
            folderPermissions: 'Current folder is writeable'
        },
        startup: {},
        update: {}
    },

    execute: function (category) {
        var includes = require('lodash/includes'),
            each = require('lodash/forEach'),
            Promise = require('bluebird'),
            eol = require('os').EOL,
            failed = false,
            checks;

        this.symbols = require('log-symbols');

        category = category || 'install';

        if (!includes(Object.keys(this.categories), category)) {
            this.ui.fail('Invalid category of checks');
        }

        checks = require('./checks/' + category);

        each(this.categories[category], function (name, check) {
            var result = checks[check]();

            if (result === true) {
                this.ui.success(this.symbols.success + ' ' + name);
                return;
            }

            this.ui.fail(this.symbols.error + ' ' + name);
            this.ui.log(eol + result);
            failed = true;
        }.bind(this));

        if (failed) {
            return Promise.reject();
        }
    }
});
