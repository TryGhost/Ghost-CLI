const path = require('path');

async function ensureSettingsFolder(context) {
    const ghostUser = require('./utils/use-ghost-user');

    const contentDir = context.instance.config.get('paths.contentPath');

    if (ghostUser.shouldUseGhostUser(contentDir)) {
        await context.ui.sudo(`mkdir -p ${path.resolve(contentDir, 'settings')}`, {sudoArgs: '-E -u ghost'});
    } else {
        const fs = require('fs-extra');
        fs.ensureDirSync(path.resolve(contentDir, 'settings'));
    }
}

async function makeSqliteAbsolute({instance}) {
    const configs = await instance.getAvailableConfigs();

    Object.values(configs).forEach((config) => {
        const currentFilename = config.get('database.connection.filename', null);
        if (!currentFilename || path.isAbsolute(currentFilename)) {
            return;
        }

        config.set('database.connection.filename', path.resolve(instance.dir, currentFilename)).save();
    });
}

module.exports = [{
    before: '1.7.0',
    title: 'Create content/settings directory',
    task: ensureSettingsFolder
}, {
    before: '1.14.1',
    title: 'Fix Sqlite DB path',
    task: makeSqliteAbsolute
}];
