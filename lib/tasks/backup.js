const path = require('path');
const zip = require('@tryghost/zip');

const debug = require('debug')('ghost-cli:backup');
const fs = require('fs-extra');

const ghostUser = require('../utils/use-ghost-user');
const {ProcessError} = require('../errors');
const {exportTask} = require('./import');

async function ensureBackupFolder(ui, instance) {
    const folderName = '../backup';

    const contentDir = instance.config.get('paths.contentPath');
    if (ghostUser.shouldUseGhostUser(contentDir)) {
        const {USER} = process.env;
        await ui.sudo(`mkdir -p ${path.resolve(contentDir, folderName)}`, {sudoArgs: `-E -u ${USER}`});
    } else {
        fs.ensureDirSync(path.resolve(contentDir, folderName));
    }
}

async function copyFiles(ui, instance, files) {
    const contentDir = instance.config.get('paths.contentPath');
    const shouldUseSudo = ghostUser.shouldUseGhostUser(contentDir);

    for (const fileKey in files) {
        const filePath = path.join(instance.dir, fileKey);
        const fileExists = fs.existsSync(filePath);

        if (fileExists) {
            debug(`copying ${fileKey} to ${files[fileKey]}`);

            const destinationFilePath = path.join(instance.dir, files[fileKey]);
            if (shouldUseSudo) {
                await ui.sudo(`cp ${filePath} ${destinationFilePath}`);
            } else {
                await fs.copy(filePath, destinationFilePath);
            }
        }
    }

    if (shouldUseSudo) {
        await ui.sudo(`chown -R ghost:ghost ${contentDir}`);
    }
}

module.exports = async function (ui, instance) {
    const datetime = require('moment')().format('YYYY-MM-DD-HH-mm-ss');
    const backupSuffix = `from-v${instance.version}-on-${datetime}`;

    // First we need to export the content into a JSON file & members into a CSV file
    const contentExportFile = `content-${backupSuffix}.json`;
    const membersExportFile = `members-${backupSuffix}.csv`;

    // Ensure the backup directory exists and has write permissions
    await ensureBackupFolder(ui, instance);

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

    await copyFiles(ui, instance, backupFiles);

    // Finally we zip everything up into a nice little package
    const zipPath = path.join(process.cwd(), `backup-${backupSuffix}.zip`);

    try {
        await zip.compress(path.join(instance.dir, 'content/'), zipPath, {glob: `{data/${contentExportFile},data/${membersExportFile},files/**,images/**,media/**,settings/**,themes/**}`, ignore: 'themes/casper'});
    } catch (err) {
        throw new ProcessError(err);
    }

    return zipPath;
};
