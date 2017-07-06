'use strict';

const os = require('os');
const execa = require('execa');
const path = require('path');

const cli = require('../../lib');

class LinuxExtension extends cli.Extension {
    setup(cmd, argv) {
        if (argv.local) {
            return;
        }

        cmd.addStage('linux-user', this.addGhostUser.bind(this), null, 'a ghost system user');
    }

    addGhostUser(argv, ctx, task) {
        if (os.platform() !== 'linux') {
            this.ui.log('Platform is not linux', 'yellow');
            return task.skip();
        }

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
            title: 'Creating ghost system user',
            skip: () => userExists,
            task: () => this.ui.sudo('useradd --system --user-group ghost')
        }, {
            title: 'Changing versions directory permissions',
            task: () => this.ui.sudo(`chown -R ghost:ghost ${path.join(ctx.instance.dir, 'versions')}`)
        }, {
            title: 'Changing content directory permissions',
            task: () => this.ui.sudo(`chown -R ghost:ghost ${path.join(ctx.instance.dir, 'content')}`)
        }], false);
    }
}

module.exports = LinuxExtension;
