var BaseCommand = require('./base');

module.exports = BaseCommand.extend({
    name: 'install',
    description: 'install a brand new instance of Ghost',

    arguments: [
        {name: 'version', optional: true}
    ],
    options: [{
        name: 'dir',
        alias: 'd',
        description: 'Folder to install Ghost in'
    }],

    execute: function (version, options) {
        var download = require('download'),
            Promise = require('bluebird'),
            path = require('path'),
            fs = require('fs-extra'),

            getVersion = require('../utils/get-version'),
            self = this,
            dir, installPath;

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
        }).then(function checkVersion() {
            return getVersion(version);
        }).then(function downloadGhost(meta) {
            version = meta.version;
            installPath = path.join(process.cwd(), 'versions', version);

            return self.ui.run(download(meta.url, installPath, {extract: true}), 'Downloading Ghost');
        }).then(function npmInstall() {
            return self.runTask('npm-install', {cwd: installPath});
        }).then(function symLinksForTheWin() {
            return self.runTask('make-symlinks', {base: installPath});
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
            // Make sure we save the current cli version to the config
            self.config.set('cli-version', options.parent._version).save();

            if (!answer.start) {
                return Promise.resolve();
            }

            self.config.set('name', answer.name).save();

            return self.runCommand('start');
        });
    }
});
