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
                var KnexMigrator = require('knex-migrator'),
                    knexMigrator;
                /**
                 * If we require any JS file from Ghost source code (for example the config), then it's always env-less!
                 *
                 * 1. Ghost-CLI requires knex-migrator
                 * 2. knex-migrator loads the .knex-migrator config file from the current Ghost version
                 * 3. this is env-less
                 *
                 * Alternative solution is: passing the env into knex-migrator, but that feels not right?
                 * @TODO: rethink
                 */
                process.env.NODE_ENV = environment;

                // @TODO: where to get this path from?
                knexMigrator = new KnexMigrator({
                    knexMigratorFilePath: process.cwd() + '/current'
                });

                return knexMigrator.isDatabaseOK()
                    .catch(function () {
                        return knexMigrator.init();
                    });
            }).then(function () {
                return self.ui.run(
                    Promise.resolve(pm.start(process.cwd(), environment)),
                    'Starting Ghost instance'
                );
            }).then(function () {
                cliConfig.set('running', environment).save();
            });
    }
});
