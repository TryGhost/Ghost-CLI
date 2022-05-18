const path = require('path');

const debug = require('debug')('ghost-cli:backup');
const execa = require('execa');
const fs = require('fs-extra');

const {ProcessError} = require('../errors');
const {exportTask} = require('./import');

module.exports = async function (ui, instance) {
    // First we need to export the content into a JSON file
    const contentExportPath = 'data/backup.json';
    await exportTask(ui, instance, path.join(instance.dir, 'content/', contentExportPath));

    // Next we need to copy `redirects.*` files from `data/` to `settings/` because
    // we're not going to backup `data/
    const backupFiles = {
        'content/data/redirects.json': 'content/settings/redirects.json',
        'content/data/redirects.yaml': 'content/settings/redirects.yaml'
    };

    for (const backupFilesKey in backupFiles) {
        const filePath = path.join(instance.dir, backupFilesKey);
        const fileExists = fs.existsSync(filePath);

        if (fileExists) {
            debug(`copying ${backupFilesKey} to ${backupFiles[backupFilesKey]}`);

            const destinationFilePath = path.join(instance.dir, backupFiles[backupFilesKey]);
            fs.copySync(filePath, destinationFilePath);
        }
    }

    // Finally we zip everything up into a nice little package
    const datetime = require('moment')().format('YYYY-MM-DD-HH-mm-ss');
    const zipPath = path.join(process.cwd(), `backup-from-v${instance.version}-on-${datetime}.zip`);

    try {
        execa.shellSync(`zip -r ${zipPath} ${contentExportPath} files/ images/ media/ settings/ themes/`, {
            cwd: path.join(instance.dir, 'content/')
        });
    } catch (err) {
        throw new ProcessError(err);
    }

    return zipPath;
};
