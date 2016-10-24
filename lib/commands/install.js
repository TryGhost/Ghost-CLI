var BaseCommand = require('./base'),
    advancedOptions = require('./config/advanced');

module.exports = {
    name: 'install',
    description: 'install a brand new instance of Ghost',

    arguments: [
        {name: 'version', optional: true}
    ],
    options: [{
        name: 'dir',
        alias: 'd',
        description: 'Folder to install Ghost in'
    }, {
        name: 'no-setup',
        alias: 'N',
        description: 'Don\'t automatically run the setup command',
        flag: true
    }].concat(advancedOptions)
};

module.exports.Command = BaseCommand.extend({
    execute: function (version, options) {
        var Promise         = require('bluebird'),
            path            = require('path'),
            fs              = require('fs-extra'),
            resolveVersion  = require('../utils/resolve-version'),
            Config          = require('../utils/config'),
            self            = this,
            local           = false,
            installPath, dir;

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

        if (version === 'local') {
            local = true;
            version = null;
        }

        return resolveVersion(version).then(function runDoctor(resolvedVersion) {
            version = resolvedVersion;
            installPath = path.join(process.cwd(), 'versions', version);

            return self.runCommand('doctor');
        }).then(function ensureStructure() {
            return self.runTask('ensure-structure');
        }).then(function installGhost() {
            return self.runTask('npm-download', {
                module: 'ghost',
                version: version,
                destination: installPath
            }, 'Downloading and installing Ghost');
        }).then(function moveCasper() {
            var move = Promise.promisify(fs.move);

            // TODO: this should be re-thought
            return move(
                path.join(installPath, 'content', 'themes', 'casper'),
                path.join(process.cwd(), 'content', 'themes', 'casper')
            );
        }).then(function afterMove() {
            var symlinkSync = require('symlink-or-copy').sync,
                cliConfig   = Config.load('.ghost-cli');

            symlinkSync(installPath, path.join(process.cwd(), 'current'));

            // Make sure we save the current cli version to the config
            // also - this ensures the config exists so the config command
            // doesn't throw errors
            cliConfig.set('cli-version', options.parent._version)
                .set('active-version', version).save();

            if (!options.setup) {
                return Promise.resolve();
            }

            delete options.dir;
            delete options.setup;
            options.local = local;

            return self.runCommand('setup', options);
        });
    }
});
