'use strict';
const path = require('path');
const spawn = require('child_process').spawn;
const KnexMigrator = require('knex-migrator');

const Config = require('../utils/config');
const checkValidInstall     = require('../utils/check-valid-install');
const resolveProcessManager = require('../utils/resolve-process');

let child;

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
            error.code === 'DATABASE_DOES_NOT_EXIST' ||
            error.code === 'MIGRATION_TABLE_IS_MISSING') {
            return knexMigrator.init();
        }
    }).then(() => {
        child = spawn(process.execPath, ['current/index.js'], {
            cwd: process.cwd(),
            stdio: [0, 1, 2, 'ipc']
        });

        child.on('error', (error) => {
            this.ui.fail(error);
            process.exit(1);
        });

        child.on('message', (message) => {
            if (message.started) {
                processManager.success();
                return;
            }

            processManager.error(message.error);
        });
    }).catch((error) => {
        processManager.error(error.message);
    });
};

module.exports.exit = function exit() {
    if (child) {
        child.kill();
    }
};
