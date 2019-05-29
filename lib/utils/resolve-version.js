'use strict';
const semver = require('semver');
const Promise = require('bluebird');
const packageInfo = require('package-json');

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

    let comparator;

    if (!force && activeVersion) {
        comparator = `>${activeVersion}`;
    } else if (force && activeVersion) {
        comparator = `>=${activeVersion}`;
    } else {
        comparator = MIN_RELEASE;
    }

    if (v1) {
        comparator += ' <2.0.0';
    }

    return packageInfo('ghost', {allVersions: true}).then((result) => {
        const versions = Object.keys(result.versions).filter(v => semver.satisfies(v, comparator)).sort(semver.compare);

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

        // CASE: you haven't passed `--v1` and you are not about to install a fresh blog
        if (!v1 && activeVersion) {
            const majorVersionJump = semver.major(activeVersion) !== semver.major(versionToReturn);
            const v1Versions = versions.filter(version => semver.satisfies(version, `^${activeVersion}`));

            // CASE 1: you want to force update and you are not on the latest v1 version
            // CASE 2: you don't use force and you are not on the latest v1 version
            if (majorVersionJump && force && versions.length > 1) {
                const latestV2 = versionToReturn;
                while (!semver.satisfies(versionToReturn, '^1.0.0')) {
                    versionToReturn = versions.pop();
                }

                // super dirty hack @todo: fixme
                if (versionToReturn === activeVersion) {
                    versionToReturn = latestV2;
                }
            } else if (majorVersionJump && !force && v1Versions.length) {
                return Promise.reject(new errors.CliError({
                    message: 'You are about to migrate to Ghost 2.0. Your blog is not on the latest Ghost 1.0 version.',
                    help: 'Instead run "ghost update --v1".'
                }));
            }
        }

        return versionToReturn;
    });
};
