'use strict';
const fs = require('fs');
const path = require('path');
const errors = require('../errors');
const semver = require('semver');
const AdmZip = require('adm-zip');

module.exports = function versionFromZip(zipPath, currentVersion) {
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

    if (currentVersion && semver.lt(pkg.version, currentVersion)) {
        return Promise.reject(
            new errors.SystemError('Zip file contains an older release version than what is currently installed.')
        );
    }

    return Promise.resolve(pkg.version);
};
