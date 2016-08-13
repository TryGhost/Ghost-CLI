var BaseCommand = require('./base');

module.exports = BaseCommand.extend({
    name: 'update',
    description: 'update a Ghost instance',

    arguments: [
        {name: 'version', optional: true}
    ],
    options: [{
        name: 'rollback',
        alias: 'R',
        description: 'Rollback to the previously installed Ghost version',
        flag: true
    }],

    execute: function (version, options) {
        this.checkValidInstall();

        var download = require('download'),
            Promise = require('bluebird'),
            path = require('path'),

            getVersion = require('../utils/get-version'),
            self = this,
            installPath;

        if (options.rollback) {
            if (!this.config.get('previous-version')) {
                return Promise.reject('No previous version found!');
            }

            version = this.config.get('previous-version');
            installPath = path.join(process.cwd(), 'versions', version);
        }

        return this.runCommand('doctor').then(function checkVersion() {
            if (options.rollback) {
                return Promise.resolve();
            }

            return getVersion(version, true).then(function downloadGhost(meta) {
                version = meta.version;
                installPath = path.join(process.cwd(), 'versions', version);

                return self.ui.run(download(meta.url, installPath, {extract: true}), 'Downloading Ghost');
            }).then(function npmInstall() {
                return self.runTask('npm-install', {cwd: installPath});
            });
        }).then(function stopGhost() {
            return self.runCommand('stop');
        }).then(function symLinksForTheWin() {
            return self.runTask('make-symlinks', {base: installPath, clearExisting: true});
        }).then(function restartGhost() {
            self.config.set(
                'previous-version',
                (options.rollback) ? null : self.config.get('active-version')
            ).set('active-version', version).save();

            return self.runCommand('start');
        });
    }
});
