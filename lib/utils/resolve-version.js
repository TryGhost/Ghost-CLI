'use strict';
const semver    = require('semver');
const Promise   = require('bluebird');
const filter    = require('lodash/filter');
const includes  = require('lodash/includes');

const yarn = require('./yarn');
const errors = require('../errors');
const MIN_RELEASE = '>= 1.0.0';

/**
 * Resolves the ghost version to installed based on available NPM versions
 * and/or a passed version & any locally installed versions
 *
 * @param {string} version Any version supplied manually by the user
 * @param {string} update Current version if we are updating
 * @return Promise<string> Promise that resolves with the version to install
 */
module.exports = function resolveVersion(version, update) {
    // If version contains a leading v, remove it
    if (version && version.match(/^v[0-9]/)) {
        version = version.slice(1);
    }

    if (version && !semver.satisfies(version, MIN_RELEASE)) {
        return Promise.reject(new errors.CliError({
            message: 'Ghost-CLI cannot install versions of Ghost less than 1.0.0',
            log: false
        }));
    }

    return yarn(['info', 'ghost', 'versions', '--json']).then((result) => {
        try {
            let versions = JSON.parse(result.stdout).data || [];

            versions = filter(versions, function (availableVersion) {
                if (update) {
                    return semver.satisfies(availableVersion, '>' + update);
                }

                return semver.satisfies(availableVersion, MIN_RELEASE);
            });

            if (!versions.length) {
                return Promise.reject(new errors.CliError({
                    message: 'No valid versions found.',
                    log: false
                }));
            }

            if (version && !includes(versions, version)) {
                return Promise.reject(new errors.CliError({
                    message: `Invalid version specified: ${version}`,
                    log: false
                }));
            }

            return version || versions.pop();
        } catch (e) {
            return Promise.reject(new errors.CliError({
                message: 'Ghost-CLI was unable to load versions from Yarn.',
                log: false
            }));
        }
    });
};
