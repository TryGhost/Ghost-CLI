'use strict';
const fs = require('node:fs');
const tmp = require('tmp');
const path = require('path');

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

    const setup = typeof typeOrDefinition === 'object' ? typeOrDefinition : builtin[typeOrDefinition];

    if (!setup) {
        return null;
    }

    dir = dir || tmp.dirSync({unsafeCleanup: true}).name;

    if (setup.dirs) {
        setup.dirs.forEach((dirToCreate) => {
            fs.mkdirSync(path.join(dir, dirToCreate), {recursive: true});
        });
    }

    if (setup.files) {
        setup.files.forEach((file) => {
            const target = path.join(dir, file.path);
            fs.mkdirSync(path.dirname(target), {recursive: true});
            fs.writeFileSync(target, file.json ? JSON.stringify(file.content) : file.content);
        });
    }

    if (setup.links) {
        setup.links.forEach((link) => {
            const linkPath = path.join(dir, link[1]);
            fs.mkdirSync(path.dirname(linkPath), {recursive: true});
            fs.symlinkSync(path.join(dir, link[0]), linkPath);
        });
    }

    const testFolder = {
        dir: dir,
        cleanup: () => {
            fs.rmSync(dir, {recursive: true, force: true});
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
