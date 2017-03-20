'use strict';
const fs = require('fs');
const path = require('path');
const KnexMigrator = require('knex-migrator');
const Listr = require('listr');

const Config = require('../utils/config');
const errors = require('../errors');
const startupChecks = require('./doctor/checks/startup');
const checkValidInstall = require('../utils/check-valid-install');

module.exports.execute = function execute(options) {
    checkValidInstall('start');

    options = options || {};
    let config, cliConfig;

    // If we are starting in production mode but a development config exists and a production config doesn't,
    // we want to start in development mode anyways.
    if (!this.development && fs.existsSync(path.join(process.cwd(), 'config.development.json')) &&
            !fs.existsSync(path.join(process.cwd(), 'config.production.json'))) {
        this.ui.log('Found a development config but not a production config, starting in development mode instead.', 'yellow');
        this.development = false;
        process.env.NODE_ENV = this.environment = 'development';
    }

    return new Listr(startupChecks, {renderer: this.renderer}).run(this).then(() => {
        config = Config.load(this.environment);
        cliConfig = Config.load('.ghost-cli');

        if (cliConfig.has('running')) {
            return Promise.reject(new Error('Ghost is already running.'));
        }

        this.service.setConfig(config);

        process.env.paths__contentPath = path.join(process.cwd(), 'content');

        let knexMigrator = new KnexMigrator({
            knexMigratorFilePath: path.join(process.cwd(), 'current')
        });

        return knexMigrator.isDatabaseOK().catch((error) => {
            if (error.code === 'DB_NOT_INITIALISED' ||
                error.code === 'MIGRATION_TABLE_IS_MISSING') {
                return knexMigrator.init();
            } else if (error.code === 'DB_NEEDS_MIGRATION') {
                return knexMigrator.migrate();
            }

            if (error.code === 'ENOTFOUND') {
                // Database not found
                error = new errors.ConfigError({
                    configKey: 'database.connection.host',
                    configValue: config.get('database.connection.host'),
                    message: 'Invalid database host',
                    environment: this.environment
                });
            } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
                error = new errors.ConfigError({
                    configKey: 'database.connection.user',
                    configValue: config.get('database.connection.user'),
                    message: 'Invalid database username or password',
                    environment: this.environment
                });
            }

            return Promise.reject(error);
        });
    }).then(() => {
        let start = () => Promise.resolve(this.service.process.start(process.cwd(), this.environment)).then(() => {
            cliConfig.set('running', this.environment).save();
            return Promise.resolve();
        });

        if (options.quiet) {
            return start();
        }

        return this.ui.run(start, 'Starting Ghost').then(() => {
            this.ui.log(`You can access your blog at ${config.get('url')}`, 'cyan');
        });
    });
};
