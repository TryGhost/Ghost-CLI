const path = require('path');

const debug = require('debug')('ghost-cli:backup');
const execa = require('execa');
const fs = require('fs-extra');

const {ProcessError} = require('../errors');
const {exportTask} = require('./import');

module.exports = async function (ui, instance) {
    const datetime = require('moment')().format('YYYY-MM-DD-HH-mm-ss');
    const backupSuffix = `from-v${instance.version}-on-${datetime}`;

    // First we need to export the content into a JSON file & members into a CSV file
    const contentExportFile = `content-${backupSuffix}.json`;
    const membersExportFile = `members-${backupSuffix}.csv`;

    // Ensure the backup directory exists and has write permissions
    const {USER} = process.env;
    await ui.sudo(`mkdir -p ${path.join(instance.dir, 'backup')}`);
    await ui.sudo(`chown -R ${USER}:${USER} ${path.join(instance.dir, 'backup')}`);

    // Generate backup files
    await exportTask(ui, instance, path.join(instance.dir, 'backup/', contentExportFile), path.join(instance.dir, 'backup/', membersExportFile));

    // Next we need to copy `redirects.*` files from `data/` to `settings/` because
    // we're not going to backup `data/
    const backupFiles = {
        'content/data/redirects.json': 'content/settings/redirects.json',
        'content/data/redirects.yaml': 'content/settings/redirects.yaml',
        [`backup/${contentExportFile}`]: `content/data/${contentExportFile}`,
        [`backup/${membersExportFile}`]: `content/data/${membersExportFile}`
    };

    for (const backupFilesKey in backupFiles) {
        const filePath = path.join(instance.dir, backupFilesKey);
        const fileExists = fs.existsSync(filePath);

        if (fileExists) {
            debug(`copying ${backupFilesKey} to ${backupFiles[backupFilesKey]}`);

            const destinationFilePath = path.join(instance.dir, backupFiles[backupFilesKey]);
            await ui.sudo(`cp ${filePath} ${destinationFilePath}`);
        }
    }

    await ui.sudo(`chown -R ghost:ghost ${path.join(instance.dir, 'content')}`);

    // Finally we zip everything up into a nice little package
    const zipPath = path.join(process.cwd(), `backup-${backupSuffix}.zip`);

    try {
        execa.shellSync(`zip -r ${zipPath} data/${membersExportFile} data/${membersExportFile} files/ images/ media/ settings/ themes/`, {
            cwd: path.join(instance.dir, 'content/')
        });
    } catch (err) {
        throw new ProcessError(err);
    }

    return zipPath;
};
