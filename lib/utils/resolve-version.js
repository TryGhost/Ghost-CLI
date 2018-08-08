'use strict';
const semver    = require('semver');
const Promise   = require('bluebird');

const yarn = require('./yarn');
const errors = require('../errors');
const MIN_RELEASE = '>= 1.0.0';

/**
 * Resolves the ghost version to installed based on available NPM versions
 * and/or a passed version & any locally installed versions
 *
 * @param {String} version Any version supplied manually by the user
 * @param {String} activeVersion Current version if we are updating
 * @param {Boolean} v1 Whether or not to limit versions to 1.x release versions
 * @return Promise<string> Promise that resolves with the version to install
 */
module.exports = function resolveVersion(version, activeVersion, v1 = false, force = false) {
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
        let comparator = !force && activeVersion ? `>${activeVersion}` : MIN_RELEASE;

        if (v1) {
            comparator += ' <2.0.0';
        }

        try {
            let versions = JSON.parse(result.stdout).data || [];
            versions = versions.filter(availableVersion => semver.satisfies(availableVersion, comparator));

            if (!versions.length) {
                return Promise.reject(new errors.CliError({
                    message: 'No valid versions found.',
                    log: false
                }));
            }

            if (version && !versions.includes(version)) {
                return Promise.reject(new errors.CliError({
                    message: `Invalid version specified: ${version}`,
                    log: false
                }));
            }

            let versionToReturn = version || versions.pop();

            if (v1 && activeVersion && semver.satisfies(activeVersion, '^2.0.0')) {
                return Promise.reject(new errors.CliError({
                    message: 'You can\'t downgrade from v2 to v1 using these options.',
                    help: 'Please run "ghost update --rollback".'
                }));
            }

            // CASE: you haven't passed `--v1` and you are not about to install a fresh blog
            if (!v1 && activeVersion) {
                const majorVersionJump = semver.major(activeVersion) !== semver.major(versionToReturn);

                // CASE: use latest v1 release
                if (majorVersionJump && force) {
                    while (!semver.satisfies(versionToReturn, '^1.0.0')) {
                        versionToReturn = versions.pop();
                    }
                } else if (majorVersionJump && versions.length) {
                    return Promise.reject(new errors.CliError({
                        message: 'You are about to migrate to Ghost 2.0. Your blog is not on the latest Ghost 1.0 version.',
                        help: 'Please run "ghost update --v1".'
                    }));
                }
            }

            return versionToReturn;
        } catch (e) {
            return Promise.reject(new errors.CliError({
                message: 'Ghost-CLI was unable to load versions from Yarn.',
                log: false
            }));
        }
    });
};
