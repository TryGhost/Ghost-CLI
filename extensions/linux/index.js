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

        cmd.addStage('linux-user', this.addGhostUser.bind(this), [], '"ghost" system user');
    }

    addGhostUser(argv, ctx, task) {
        if (os.platform() !== 'linux') {
            this.ui.log('Operating system is not Linux', 'yellow');
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
            title: 'Creating "ghost" system user',
            skip: () => userExists,
            task: () => this.ui.sudo('useradd --system --user-group ghost')
        }, {
            title: 'Giving "ghost" user ownership of the /content/ directory',
            task: () => this.ui.sudo(`chown -R ghost:ghost ${path.join(ctx.instance.dir, 'content')}`)
        }], false);
    }

    uninstall(instance) {
        if (os.platform() !== 'linux') {
            return Promise.resolve();
        }

        // because we have changed the ownership of the ghost content folder,
        // we need to remove it manually here via sudo
        return this.ui.sudo(`rm -rf ${path.join(instance.dir, 'content')}`);
    }
}

module.exports = LinuxExtension;
