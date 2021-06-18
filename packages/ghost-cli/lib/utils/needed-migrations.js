'use strict';
const semver = require('semver');
const flatten = require('lodash/flatten');

const coreMigrations = require('../migrations');

/**
 * @param {String} originalVersion Original version that installed the instance
 * @param {String} currentVersion Current CLI version
 * @param {Array} extensionMigrations Migrations returned from extensions
 */
module.exports = function parseNeededMigrations(originalVersion, currentVersion, extensionMigrations) {
    const migrations = coreMigrations.concat(flatten(extensionMigrations).filter(Boolean));

    return migrations.filter((migration) => {
        // If the migration has a `before` property defined and the original CLI version is before it
        if (migration.before && semver.gte(originalVersion, migration.before)) {
            return false;
        }

        return true;
    });
};
