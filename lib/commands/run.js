'use strict';
const path = require('path');
const KnexMigrator = require('knex-migrator');

const Config = require('../utils/config');
const Instance = require('../utils/instance');
const checkValidInstall     = require('../utils/check-valid-install');
const resolveProcessManager = require('../utils/resolve-process');

let instance;

module.exports.execute = function execute() {
    checkValidInstall('run');

    process.env.NODE_ENV = this.environment;
    process.env.paths__contentPath = path.join(process.cwd(), 'content');

    let config = Config.load(`config.${this.environment}.json`);
    let knexMigrator = new KnexMigrator({
        knexMigratorFilePath: path.join(process.cwd(), 'current')
    });
    let processManager = resolveProcessManager(config);

    return knexMigrator.isDatabaseOK().catch((error) => {
        if (error.code === 'DB_NOT_INITIALISED' ||
            error.code === 'MIGRATION_TABLE_IS_MISSING') {
            return knexMigrator.init();
        } else if (error.code === 'DB_NEEDS_MIGRATION') {
            return knexMigrator.migrate();
        }
    }).then(() => {
        instance = new Instance(this.ui, config, processManager);
    }).catch((error) => {
        processManager.error(error.message);
    });
};

module.exports.exit = function exit() {
    if (instance) {
        instance.kill();
    }
};
