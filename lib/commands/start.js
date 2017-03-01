'use strict';
const fs = require('fs');
const path = require('path');
const KnexMigrator = require('knex-migrator');

const Config = require('../utils/config');
const checkValidInstall     = require('../utils/check-valid-install');

function register(config, environment) {
    let systemConfig = Config.load('system');
    let instances = systemConfig.get('instances', {});

    instances[config.get('pname')] = {
        mode: environment,
        cwd: process.cwd(),
        url: config.get('url'),
        port: config.get('server.port'),
        process: config.get('process')
    };
    systemConfig.set('instances', instances).save();
}

module.exports.execute = function execute(options) {
    checkValidInstall('start');

    options = options || {};

    // If we are starting in production mode but a development config exists and a production config doesn't,
    // we want to start in development mode anyways.
    if (!this.development && fs.existsSync(path.join(process.cwd(), 'config.development.json')) &&
            !fs.existsSync(path.join(process.cwd(), 'config.production.json'))) {
        this.ui.log('Found a development config but not a production config, starting in development mode instead.', 'yellow');
        this.development = false;
        process.env.NODE_ENV = this.environment = 'development';
    }

    let config = Config.load(this.environment);
    let cliConfig = Config.load('.ghost-cli');

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
    }).then(() => {
        let start = () => Promise.resolve(this.service.process.start(process.cwd(), this.environment)).then(() => {
            register(config, this.environment);
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
