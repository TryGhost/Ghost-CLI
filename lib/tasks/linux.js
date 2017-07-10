'use strict';

const execa = require('execa');
const path = require('path');

module.exports = function linuxSetupTask(ctx) {
    let userExists = false;

    try {
        execa.shellSync('id ghost');
        userExists = true;
    } catch (e) {
        if (!e.message.match(/no such user/)) {
            return Promise.reject(e);
        }
    }

    return this.ui.listr([{
        title: 'Creating "ghost" system user',
        skip: () => userExists,
        task: () => this.ui.sudo('useradd --system --user-group ghost')
    }, {
        title: 'Giving "ghost" user ownership of the /content/ directory',
        task: () => this.ui.sudo(`chown -R ghost:ghost ${path.join(ctx.instance.dir, 'content')}`)
    }], false);
};

