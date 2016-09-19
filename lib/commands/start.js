var BaseCommand = require('./base');

module.exports = BaseCommand.extend({
    name: 'start',
    description: 'starts a named instance of Ghost',

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
    }],

    // TODO: this currently only supports pm2 process running.
    // This should be extended to support custom methods of stopping/starting
    // ghost
    execute: function (options) {
        // ensure we are within a valid ghost install
        this.checkValidInstall();

        var resolveProcessManager = require('../process').resolve,
            Config = require('../utils/config'),
            Promise = require('bluebird'),
            env = {},
            environment, config, pm, cliConfig;

        options = options || {};
        env.NODE_ENV = environment = (options.production || !options.development) ? 'production' : 'development';

        config = new Config('config.' + environment + '.json');
        cliConfig = new Config('.ghost-cli');

        if (cliConfig.has('running')) {
            return Promise.reject('Ghost is already running.');
        }

        pm = resolveProcessManager(config);

        return this.ui.run(
            Promise.resolve(pm.start(process.cwd())),
            'Starting Ghost instance'
        ).then(function () {
            cliConfig.set('running', environment).save();
        });
    }
});
