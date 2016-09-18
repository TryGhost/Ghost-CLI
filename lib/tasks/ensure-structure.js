var BaseTask = require('./base'),
    path = require('path'),
    fs = require('fs-extra');

module.exports = BaseTask.extend({
    name: 'ensure-structure',
    description: 'Setting up the Ghost installation structure',

    run: function run() {
        var cwd = process.cwd();

        // Create `versions` directory
        fs.ensureDirSync(path.resolve(cwd, 'versions'));

        // Create `content` directory
        fs.ensureDirSync(path.resolve(cwd, 'content'));
    }
});
