'use strict';
const semver    = require('semver');
const Promise   = require('bluebird');
const filter    = require('lodash/filter');
const includes  = require('lodash/includes');

const npm = require('./npm');
const MIN_RELEASE = '>= 1.0.0-alpha.9';

module.exports = function resolveVersion(version, update) {
    // If version contains a leading v, remove it
    if (version && version.match(/^v[0-9]/)) {
        version = version.slice(1);
    }

    if (version && !semver.satisfies(version, MIN_RELEASE)) {
        return Promise.reject(new Error('Ghost-CLI cannot install versions of Ghost less than 1.0.0'));
    }

    return npm(['view', 'ghost', 'versions', '--json']).then((result) => {
        try {
            let versions = JSON.parse(result.stdout);

            versions = filter(versions, function (availableVersion) {
                if (update) {
                    return semver.satisfies(availableVersion, '>' + update);
                }

                return semver.satisfies(availableVersion, MIN_RELEASE);
            });

            if (!versions.length) {
                return Promise.reject(new Error('No valid versions found.'));
            }

            if (version && !includes(versions, version)) {
                return Promise.reject(new Error('Invalid version specified: ' + version));
            }

            return version || versions.pop();
        } catch (e) {
            return Promise.reject(new Error('Ghost-CLI was unable to load versions from NPM.'));
        }
    });
};
