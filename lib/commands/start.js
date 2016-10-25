var BaseCommand = require('./base');

module.exports = {
    name: 'start',
    description: 'starts an instance of Ghost',

    options: [{
        name: 'development',
        alias: 'D',
        description: 'Start ghost in development mode',
        flag: true
    }, {
        name: 'production',
        alias: 'P',
        description: 'Start ghost in production mode',
        flag: true
    }]
};

module.exports.Command = BaseCommand.extend({
    execute: function (options) {
        // ensure we are within a valid ghost install
        this.checkValidInstall();

        var resolveProcessManager = require('../process').resolve,
            Config = require('../utils/config'),
            Promise = require('bluebird'),
            path = require('path'),
            self = this,
            environment, config, pm, cliConfig;

        options = options || {};
        environment = (options.production || !options.development) ? 'production' : 'development';

        config = Config.load('config.' + environment + '.json');
        cliConfig = Config.load('.ghost-cli');

        if (cliConfig.has('running')) {
            return Promise.reject('Ghost is already running.');
        }

        pm = resolveProcessManager(config);

        // TODO: rethink this
        return this.runCommand('config', 'paths.contentPath', path.join(process.cwd(), 'content'), {environment: environment})
            .then(function () {
                return self.ui.run(
                    Promise.resolve(pm.start(process.cwd(), environment)),
                    'Starting Ghost instance'
                );
            }).then(function () {
                cliConfig.set('running', environment).save();
            });
    }
});
