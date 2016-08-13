var BaseCommand = require('./base'),
    Promise = require('bluebird'),
    path = require('path'),
    fs = require('fs-extra');

module.exports = BaseCommand.extend({
    name: 'install',
    description: 'install a brand new instance of Ghost',

    arguments: [
        {name: 'version', optional: true}
    ],
    options: [{
        name: 'dir',
        alias: 'D',
        description: 'Folder to install Ghost in'
    }],

    execute: function (version, options) {
        var self = this,
            dir, versionPath;
        // Dir was specified, so we make sure it exists and chdir into it.
        if (options.dir) {
            dir = path.resolve(options.dir);

            fs.ensureDirSync(dir);
            process.chdir(dir);
        }

        // Check if directory is empty before proceeding
        if (fs.readdirSync(process.cwd()).length) {
            return Promise.reject('Current directory is not empty, Ghost cannot be installed here.');
        }

        return this.runCommand('doctor').then(function ensureStructure() {
            return self.runTask('ensure-structure');
        }).then(function download() {
            return self.runTask('download-version', {version: version});
        }).then(function npmInstall(_versionPath) {
            // TODO: move versionPath out of download-version, which will
            // remove the need for this hack
            versionPath = _versionPath;
            return self.runTask('npm-install', {cwd: versionPath});
        }).then(function symLinksForTheWin() {
            return self.runTask('make-symlinks', {base: versionPath});
        }).then(function ask() {
            return self.ui.prompt([{
                type: 'confirm',
                name: 'start',
                message: 'Do you want to start the Ghost Demo App?',
                default: true
            }, {
                type: 'input',
                name: 'name',
                message: 'Give your Ghost instance a name',
                when: function when(answer) {
                    return answer.start;
                }
            }]);
        }).then(function shouldWeStart(answer) {
            if (!answer.start) {
                return Promise.resolve();
            }

            return self.runCommand('start', answer.name);
        });
    }
});
