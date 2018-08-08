'use strict';

function ensureSettingsFolder(context) {
    const path = require('path');
    const ghostUser = require('./utils/use-ghost-user');

    const contentDir = context.instance.config.get('paths.contentPath');

    if (ghostUser.shouldUseGhostUser(contentDir)) {
        return context.ui.sudo(`mkdir -p ${path.resolve(contentDir, 'settings')}`, {sudoArgs: '-E -u ghost'});
    } else {
        const fs = require('fs-extra');
        fs.ensureDirSync(path.resolve(contentDir, 'settings'));
        return Promise.resolve();
    }
}

module.exports = [{
    before: '1.7.0',
    title: 'Create content/settings directory',
    task: ensureSettingsFolder
}];
