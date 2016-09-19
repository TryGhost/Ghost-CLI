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

        var Promise     = require('bluebird'),
            path        = require('path'),
            Config      = require('../utils/config'),
            findVersion = require('../utils/version'),
            config      = new Config('.ghost-cli'),
            self        = this,
            installPath;

        if (options.rollback) {
            if (!config.get('previous-version')) {
                return Promise.reject('No previous version found');
            }

            version = config.get('previous-version');
            installPath = path.join(process.cwd(), 'versions', version);
        }

        return this.runCommand('doctor', 'update').then(function resolveVersion() {
            if (options.rollback) {
                return Promise.resolve();
            }

            return findVersion(version, config.get('active-version'))
                .then(function installGhost(resolvedVersion) {
                    version = resolvedVersion;
                    installPath = path.join(process.cwd(), 'versions', version);

                    return self.runTask('npm-download', {
                        module: 'ghost',
                        version: version,
                        destination: installPath
                    }, 'Downloading the updated version of Ghost');
                });
        // }).then(function stopCurrentGhost() {
        //     return self.runCommand('stop');
        }).then(function afterStop() {
            var fs = require('fs-extra'),
                symlinkSync = require('symlink-or-copy').sync;

            fs.removeSync(path.join(process.cwd(), 'current'));

            symlinkSync(installPath, path.join(process.cwd(), 'current'));
        }).then(function restartGhost() {
            config.set(
                'previous-version',
                (options.rollback) ? null : config.get('active-version')
            ).set('active-version', version).save();

            return self.runCommand('start');
        });
    }
});
