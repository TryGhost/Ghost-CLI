var semver = require('semver'),
    Promise = require('bluebird'),
    npm = require('./npm'),
    MIN_RELEASE = '>= 1.0.0-alpha.5';

module.exports = function resolveVersion(version, update) {
    // If version contains a leading v, remove it
    if (version && version.match(/^v[0-9]/)) {
        version = version.slice(1);
    }

    if (version && !semver.satisfies(version, MIN_RELEASE)) {
        return Promise.reject('Ghost-CLI cannot install versions of Ghost less than 1.0.0');
    }

    return npm(['view', 'ghost', 'versions', '--json'], {}, {captureOutput: true})
        .then(function then(result) {
            try {
                var versions = JSON.parse(result),
                    filter = require('lodash/filter'),
                    includes = require('lodash/includes');

                versions = filter(versions, function (availableVersion) {
                    if (update) {
                        return semver.satisfies(availableVersion, '>' + update);
                    }

                    return semver.satisfies(availableVersion, MIN_RELEASE);
                });

                if (!versions.length) {
                    return Promise.reject('No valid versions found.');
                }

                if (version && !includes(versions, version)) {
                    return Promise.reject('Invalid version specified: ' + version);
                }

                return version || versions.pop();
            } catch (e) {
                return Promise.reject('Ghost-CLI was unable to load versions from NPM.');
            }
        });
};
