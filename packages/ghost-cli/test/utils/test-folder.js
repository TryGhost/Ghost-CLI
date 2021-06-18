'use strict';
const fs = require('fs-extra');
const tmp = require('tmp');
const path = require('path');
const isObject = require('lodash/isObject');

const currentTestFolders = {};

const builtin = {
    full: {
        dirs: ['versions/1.0.0', 'content'],
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

function setupTestFolder(typeOrDefinition, dir) {
    typeOrDefinition = typeOrDefinition || {}; // default to empty object

    const setup = isObject(typeOrDefinition) ? typeOrDefinition : builtin[typeOrDefinition];

    if (!setup) {
        return null;
    }

    dir = dir || tmp.dirSync({unsafeCleanup: true}).name;

    if (setup.dirs) {
        setup.dirs.forEach((dirToCreate) => {
            fs.ensureDirSync(path.join(dir, dirToCreate));
        });
    }

    if (setup.files) {
        setup.files.forEach((file) => {
            fs[(file.json ? 'writeJsonSync' : 'writeFileSync')](path.join(dir, file.path), file.content);
        });
    }

    if (setup.links) {
        setup.links.forEach((link) => {
            fs.ensureSymlinkSync(path.join(dir, link[0]), path.join(dir, link[1]));
        });
    }

    const testFolder = {
        dir: dir,
        cleanup: () => {
            fs.removeSync(dir);
            delete currentTestFolders[dir];
        }
    };

    currentTestFolders[dir] = testFolder;
    return testFolder;
}

function cleanupTestFolders() {
    Object.keys(currentTestFolders).forEach((key) => {
        currentTestFolders[key].cleanup();
    });
}

module.exports = {setupTestFolder, cleanupTestFolders};
