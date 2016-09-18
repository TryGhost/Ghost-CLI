var crypto = require('crypto'),
    path = require('path'),
    fs = require('fs-extra'),
    os = require('os'),
    _  = require('lodash'),
    setups;

setups = {
    full: {
        dirs: ['versions/1.0.0', 'config', 'content'],
        links: [
            ['versions/1.0.0', 'current'],
            ['content', 'current/content']
        ],
        files: [
            {
                path: 'versions/1.0.0/package.json',
                content: {
                    name: 'cli-testing',
                    version: '1.0.0'
                },
                json: true
            },
            {
                path: 'versions/1.0.0/index.js',
                content: ''
            },
            {
                path: '.ghost-cli',
                content: {
                    'cli-version': '0.0.1'
                },
                json: true
            }
        ]
    }
};

/**
 * Functions to assist with setting up a mock environment for testing
 *
 * Inspired by the [yeoman-test](https://github.com/yeoman/yeoman-test) module
 */
module.exports = {
    setup: function setup(type) {
        var previousDir = process.cwd(),
            tmpDir = path.join(os.tmpdir(), crypto.randomBytes(20).toString('hex'));

        if (type && setups[type]) {
            if (setups[type].dirs) {
                // create directories first
                _.each(setups[type].dirs, function (dir) {
                    fs.ensureDirSync(path.join(tmpDir, dir));
                });
            }

            if (setups[type].links) {
                // create symlinks
                _.each(setups[type].links, function (link) {
                    fs.ensureSymlinkSync(path.join(tmpDir, link[0]), path.join(tmpDir, link[1]));
                });
            }

            if (setups[type].files) {
                // then create files
                _.each(setups[type].files, function (file) {
                    fs[(file.json ? 'writeJsonSync' : 'writeFileSync')](path.join(tmpDir, file.path), file.content);
                });
            }
        }

        // Change into tmp directory
        process.chdir(tmpDir);

        return previousDir;
    },

    teardown: function teardown(previousDir) {
        var tmpDir = process.cwd();

        // Change back to previous directory
        process.chdir(previousDir);

        // // delete temp directory
        fs.removeSync(tmpDir);
    },

    exists: function exists(fileOrDirectory) {
        return fs.existsSync(path.join(process.cwd(), fileOrDirectory));
    },

    path: function (fileOrDirectory) {
        return path.join(process.cwd(), fileOrDirectory);
    }
};
