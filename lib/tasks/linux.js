'use strict';

const execa = require('execa');
const path = require('path');

module.exports = function linuxSetupTask({ui, instance}) {
    let userExists = false;

    try {
        execa.shellSync('id ghost');
        userExists = true;
    } catch (e) {
        // an error here essentially means that the user doesn't exist
        // so we don't need to do any additional checking really
    }

    return ui.listr([{
        title: 'Creating "ghost" system user',
        skip: () => userExists,
        task: () => ui.sudo('useradd --system --user-group ghost')
    }, {
        title: 'Giving "ghost" user ownership of the /content/ directory',
        task: () => ui.sudo(`chown -R ghost:ghost ${path.join(instance.dir, 'content')}`)
    }], false);
};

