var differenceWith = require('lodash/differenceWith'),
    includes = require('lodash/includes'),
    Promise = require('bluebird'),
    Github = require('github'),
    semver = require('semver'),
    find = require('lodash/find'),
    path = require('path'),
    map = require('lodash/map'),
    fs = require('fs-extra');

// TODO: replace with the actual getting of Ghost versions
function getAvailableVersions() {
    return new Promise(function (resolve, reject) {
        new Github({
            headers: {
                'user-agent': 'Ghost-CLI'
            }
        }).repos.getReleases({
            user: 'acburdine',
            repo: 'ghost-cli-app-test'
        }, function (err, result) {
            if (err) {
                return reject(err);
            }

            return resolve(result);
        });
    });
}

// TODO: move to a Task
module.exports = function getProperVersion(_version, checkExisting) {
    return getAvailableVersions().then(function (releases) {
        var versions = map(releases, 'tag_name'),
            version, downloadUrl;

        if (checkExisting) {
            versions = differenceWith(
                versions,
                fs.readdirSync(path.join(process.cwd(), 'versions')),
                function (v1, v2) {
                    // Remove versions less than or equal to the existing ones
                    return semver.satisfies(v1, '<= ' + v2);
                }
            );
        }

        if (!versions.length) {
            return Promise.reject('No versions found.');
        }

        if (_version && !includes(versions, _version)) {
            return Promise.reject('Version \'' + _version + '\' is not a valid version');
        }

        version = _version || versions[0];

        // TODO: this is rather ugly but as it's a demo it's
        // only temporary. The final result (getting actual Ghost
        // download urls) will be much simpler
        downloadUrl = find(
            find(releases, ['tag_name', version]).assets,
            function (o) { return o.name.match(/^gcat-[0-9\.]*\.zip$/); }
        ).browser_download_url;

        return Promise.resolve({
            version: version,
            url: downloadUrl
        });
    });
};
