'use strict';
const semver = require('semver');
const Promise = require('bluebird');

const yarn = require('./yarn');
const {CliError} = require('../errors');
const MIN_RELEASE = '>= 1.0.0';
const LTS_RELEASE = '>= 1.0.0 < 2.0.0';
const STABLE_RELEASE = '>= 2.0.0 < 3.0.0';

function error(message) {
    return Promise.reject(new CliError({
        message,
        log: false
    }));
}

/**
 * Resolves the ghost version to installed based on available NPM versions
 * and/or a passed version & any locally installed versions
 *
 * @param {String} version Any version supplied manually by the user
 * @param {String} activeVersion Current version if we are updating
 * @param {Boolean} lts Whether or not to limit versions to 1.x release versions
 * @return Promise<string> Promise that resolves with the version to install
 */
module.exports = function resolveVersions(version, activeVersion, ltsOnly = false, force = false) {
    // If version contains a leading v, remove it
    if (version && version.match(/^v[0-9]/)) {
        version = version.slice(1);
    }

    if (version && !semver.satisfies(version, MIN_RELEASE)) {
        return error('Ghost-CLI cannot install versions of Ghost less than 1.0.0');
    }

    return yarn(['info', 'ghost', 'versions', '--json']).then(({stdout}) => JSON.parse(stdout).data || []).catch(
        () => error('Ghost-CLI was unable to load versions from Yarn.')
    ).then((versions) => {
        const operator = force ? '>=' : '>';
        const comparator = activeVersion ? `${operator}${activeVersion}` : MIN_RELEASE;

        const ltsVersions = versions.filter(version => semver.satisfies(version, LTS_RELEASE));
        const originalVersions = versions;
        versions = (ltsOnly ? ltsVersions : versions).filter(version => semver.satisfies(version, comparator));

        if (version && !versions.includes(version)) {
            return error(`Invalid version specified: ${version}`);
        }

        if (!versions.length) {
            return error('No valid versions found.');
        }

        // CASE: target version was specified
        // CASE: target version was not specified -> default to latest version
        let targetVersion = version || versions.pop();
        const updatePath = [];
        let versionScratch = activeVersion;

        // CASE: New installation
        if (!activeVersion) {
            updatePath.push(targetVersion);
            return updatePath;
        }

        const isMajorUpdate = semver.major(targetVersion) !== semver.major(activeVersion);
        const onLatestLTS = ltsVersions[ltsVersions.length - 1] === activeVersion;

        // CASE: Update path includes a major version jump
        if (!ltsOnly && isMajorUpdate) {
            // CASE: update --force but not on latest lts --> target is latest LTS
            if (force && !onLatestLTS) {
                targetVersion = ltsVersions[ltsVersions.length - 1];
            } else if (!onLatestLTS) {
                return Promise.reject(new CliError({
                    message: 'You are about to migrate to Ghost 2.0. Your blog is not on the latest Ghost 1.0 version.',
                    help: 'Instead run "ghost update --lts".'
                }));
            // CASE: Want to upgrade to next major
            } else {
                // @todo: determine if double filtering is necessary
                versions = originalVersions.filter(version => semver.satisfies(version, STABLE_RELEASE));
                versionScratch = versions[0];
                versions = versions.filter(version => semver.satisfies(version, comparator));
                updatePath.push(versionScratch);
            }
        }

        const targetMinor = semver.minor(targetVersion);

        // Build up list of minor versions that need to be install
        while (semver.minor(versionScratch) < targetMinor) {
            versionScratch = semver.inc(versionScratch, 'minor');
            updatePath.push(versionScratch);
        }

        if (targetVersion !== versionScratch) {
            updatePath.push(targetVersion);
        }

        return updatePath;
    });
};
