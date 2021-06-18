'use strict';

const execa = require('execa');
const chalk = require('chalk');

const errors = require('../../../errors');

module.exports = function checkPermissions(type, task) {
    let errMsg;

    // fall back to check the owner permission of the content folder if nothing specified
    type = type || 'owner';

    const checkTypes = {
        owner: {
            command: 'find ./content ! -group ghost ! -user ghost',
            help: `Run ${chalk.green('sudo chown -R ghost:ghost ./content')} and try again.`
        },
        folder: {
            command: 'find ./ -type d ! -perm 775 ! -perm 755',
            // chmod mode from http://man7.org/linux/man-pages/man1/chmod.1.html#SETUID_AND_SETGID_BITS
            help: `Run ${chalk.green('sudo find ./ -type d -exec chmod 00775 {} \\;')} and try again.`
        },
        files: {
            command: 'find ./  -type f ! -path "./versions/*" ! -perm 664 ! -perm 644',
            help: `Run ${chalk.green('sudo find ./ ! -path "./versions/*" -type f -exec chmod 664 {} \\;')} and try again.`
        }
    };

    return execa.shell(checkTypes[type].command, {maxBuffer: Infinity}).then((result) => {
        if (!result.stdout) {
            return Promise.resolve();
        }
        const resultDirs = result.stdout.split('\n');
        const dirWording = resultDirs.length > 1 ? 'some directories or files' : 'a directory or file';

        errMsg = `Your installation folder contains ${dirWording} with incorrect permissions:\n`;

        resultDirs.forEach((folder) => {
            errMsg += `- ${folder}\n`;
        });

        errMsg += checkTypes[type].help;

        return Promise.reject(new errors.SystemError({
            message: errMsg,
            task: task
        }));
    }).catch((error) => {
        if (error instanceof errors.SystemError) {
            return Promise.reject(error);
        }

        if (error.stderr && error.stderr.match(/Permission denied/i)) {
            // CASE: We can't access the files or directories.
            // Print the help command for folder permissions to fix that
            errMsg = 'Ghost can\'t access some files or directories to check for correct permissions.';

            return Promise.reject(new errors.SystemError({
                message: errMsg,
                help: checkTypes.folder.help,
                err: error,
                task: task
            }));
        }

        error.task = task;
        return Promise.reject(new errors.ProcessError(error));
    });
};
