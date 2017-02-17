'use strict';
const path = require('path');
const KnexMigrator = require('knex-migrator');

const Config = require('../utils/config');
const Instance = require('../utils/instance');
const ServiceManager = require('../services');
const checkValidInstall     = require('../utils/check-valid-install');

let instance;

module.exports.execute = function execute() {
    checkValidInstall('run');

    process.env.NODE_ENV = this.environment;
    process.env.paths__contentPath = path.join(process.cwd(), 'content');

    let config = Config.load(this.environment);
    let knexMigrator = new KnexMigrator({
        knexMigratorFilePath: path.join(process.cwd(), 'current')
    });
    let sm = ServiceManager.load(config, this.ui);

    return knexMigrator.isDatabaseOK().catch((error) => {
        if (error.code === 'DB_NOT_INITIALISED' ||
            error.code === 'MIGRATION_TABLE_IS_MISSING') {
            return knexMigrator.init();
        } else if (error.code === 'DB_NEEDS_MIGRATION') {
            return knexMigrator.migrate();
        }
    }).then(() => {
        instance = new Instance(this.ui, sm.process);
    }).catch((error) => {
        sm.process.error(error.message);
    });
};

module.exports.exit = function exit() {
    if (instance) {
        instance.kill();
    }
};
