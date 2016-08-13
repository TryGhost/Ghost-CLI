var BaseTask = require('./base'),
    Github = require('github'),
    Promise = require('bluebird'),
    download = require('download'),
    path = require('path'),
    _ = require('lodash');

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

module.exports = BaseTask.extend({
    name: 'download-version',
    description: 'Downloading Ghost',

    run: function run(options) {
        return getAvailableVersions().then(function (releases) {
            var versions = _.map(releases, 'tag_name'),
                version, release, downloadUrl, downloadPath;

            // TODO: this should be simplified once we're getting actual
            // ghost versions. Also, this should probably be extracted
            // to be outside of the download version task
            if (options.version && !_.includes(versions, options.version)) {
                return Promise.reject('Version \'' + options.version + '\' is not a valid version');
            }

            version = options.version || versions[0];
            release = _.find(releases, ['tag_name', version]);

            downloadUrl = _.find(release.assets, function (o) {
                return o.name.match(/^gcat-[0-9\.]*\.zip$/);
            }).browser_download_url;
            downloadPath = path.resolve(process.cwd(), 'versions', version);

            return download(downloadUrl, downloadPath, {
                extract: true
            }).then(function afterDownload() {
                return Promise.resolve(downloadPath);
            });
        });
    }
});
