'use strict';
const fs = require('fs');
const path = require('path');
const errors = require('../errors');
const semver = require('semver');
const AdmZip = require('adm-zip');
const cliPackage = require('../../package.json');
const resolveVersion = require('./resolve-version');

module.exports = function versionFromZip(zipPath, currentVersion, force = false) {
    if (!path.isAbsolute(zipPath)) {
        zipPath = path.join(process.cwd(), zipPath);
    }

    if (!fs.existsSync(zipPath) || path.extname(zipPath) !== '.zip') {
        return Promise.reject(new errors.SystemError('Zip file could not be found.'));
    }

    const zip = new AdmZip(zipPath);
    let pkg;

    try {
        pkg = JSON.parse(zip.readAsText('package.json'));
    } catch (e) {
        return Promise.reject(new errors.SystemError('Zip file does not contain a valid package.json.'));
    }

    if (pkg.name !== 'ghost') {
        return Promise.reject(new errors.SystemError('Zip file does not contain a Ghost release.'));
    }

    if (semver.lt(pkg.version, '1.0.0')) {
        return Promise.reject(new errors.SystemError('Zip file contains pre-1.0 version of Ghost.'));
    }

    if (
        process.env.GHOST_NODE_VERSION_CHECK !== 'false' &&
        pkg.engines && pkg.engines.node && !semver.satisfies(process.versions.node, pkg.engines.node)
    ) {
        return Promise.reject(new errors.SystemError('Zip file contains a Ghost version incompatible with the current Node version.'));
    }

    if (pkg.engines && pkg.engines.cli && !semver.satisfies(cliPackage.version, pkg.engines.cli)) {
        return Promise.reject(new errors.SystemError({
            message: 'Zip file contains a Ghost version incompatible with this version of the CLI.',
            help: `Required: v${pkg.engines.cli}, current: v${cliPackage.version}`,
            suggestion: 'npm install -g ghost-cli@latest'
        }));
    }

    return resolveVersion(null, currentVersion, true)
        .then((latestV1ReleaseVersion) => {
            // CASE: if major diff and you are not on the latest v1
            if (currentVersion && semver.major(currentVersion) !== semver.major(pkg.version) &&
                currentVersion !== latestV1ReleaseVersion) {
                return Promise.reject(new errors.SystemError({
                    message: 'You are about to migrate to Ghost 2.0. Your blog is not on the latest Ghost 1.0 version.',
                    help: 'Instead run "ghost update --v1".'
                }));
            }

            if (force && semver.lt(pkg.version, currentVersion)) {
                return Promise.reject(
                    new errors.SystemError('Zip file contains an older release version than what is currently installed.')
                );
            }

            return Promise.resolve(pkg.version);
        })
        .catch((err) => {
            if (!err.message.match(/No valid versions found/)) {
                throw err;
            }

            // CASE: you are on latest v1, but you want to manually migrate to v2 using a zip
            // CASE: you are currently on a prerelease and trying to upgrade
            // CASE: upgrading from v2.0.0 to later v2 version using a zip
            if (semver.diff(currentVersion, pkg.version) === 'major' || semver.gt(pkg.version, currentVersion)) {
                return Promise.resolve(pkg.version);
            }

            throw err;
        });
};
