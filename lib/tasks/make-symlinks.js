var BaseTask = require('./base'),
    Promise = require('bluebird'),
    path = require('path'),
    fs = require('fs-extra');

module.exports = BaseTask.extend({
    name: 'make-symlinks',
    description: 'Linking things together',

    run: function run(options) {
        if (!options.base) {
            return Promise.reject('You must supply a \'base\' option to the run task');
        }

        var currentDir = path.join(process.cwd(), 'current');

        if (options.clearExisting) {
            // Clear content symlink
            fs.removeSync(path.join(currentDir, 'content'));

            // Clear current symlink
            fs.removeSync(path.join(currentDir));
        }

        // link the version into the `current` directory
        fs.ensureSymlinkSync(options.base, currentDir);

        // if there are any config files, link them into `current`
        // _.each(fs.readdirSync(path.resolve(process.cwd(), 'config')), function (file) {
        // });

        // link the `content` folder into the `current` folder
        fs.ensureSymlinkSync(path.join(process.cwd(), 'content'), path.join(currentDir, 'content'));

        return Promise.resolve();
    }
});
