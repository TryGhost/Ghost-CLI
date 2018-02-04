'use strict';
const execa = require('execa');
const path = require('path');
const Promise = require('bluebird');
const chalk = require('chalk');

const errors = require('../../../errors');
const shouldUseGhostUser = require('../../../utils/use-ghost-user');

function contentFolderPermissions() {
    return execa.shell('find ./content ! -group ghost ! -user ghost').then((result) => {
        let errMsg;

        if (!result.stdout) {
            return Promise.resolve();
        }

        const resultDirs = result.stdout.split('\n');
        const dirWording = resultDirs.length > 1 ? 'some directories or files' : 'a directory or file';

        errMsg = `Your content folder contains ${dirWording} with incorrect permissions:\n`;

        resultDirs.forEach((folder) => {
            errMsg += `- ${folder}\n`
        });

        errMsg += `Run ${chalk.blue('sudo chown -R ghost:ghost ./content')} and try again.`

        return Promise.reject(new errors.SystemError(errMsg));
    }).catch((error) => {
        if (error instanceof errors.SystemError) {
            return Promise.reject(error);
        }
        return Promise.reject(new errors.ProcessError(error));
    });
}

module.exports = {
    title: 'Content folder permissions',
    enabled: () => shouldUseGhostUser(path.join(process.cwd(), 'content')),
    task: contentFolderPermissions,
    category: ['start', 'update']
}
