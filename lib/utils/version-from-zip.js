'use strict';
const fs = require('fs');
const path = require('path');
const errors = require('../errors');
const semver = require('semver');
const AdmZip = require('adm-zip');
const cliPackage = require('../../package.json');

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

    if (force && semver.lt(pkg.version, currentVersion)) {
        return Promise.reject(
            new errors.SystemError('Zip file contains an older release version than what is currently installed.')
        );
    }

    return Promise.resolve(pkg.version);
};
