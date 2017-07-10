'use strict';

const fs = require('fs');
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

    run(argv, instance) {
        if (os.platform() !== 'linux') {
            // platform isn't linux, we don't need to to anything
            return Promise.resolve();
        }

        let ghostuid, ghostgid;

        try {
            ghostuid = execa.shellSync('id -u ghost').stdout;
            ghostgid = execa.shellSync('id -g ghost').stdout;
        } catch (e) {
            if (!e.message.match(/no such user/)) {
                return Promise.reject(new cli.errors.ProcessError(e));
            }

            // Ghost user doesn't exist, skip
            return Promise.resolve();
        }

        ghostuid = parseInt(ghostuid);
        ghostgid = parseInt(ghostgid);

        let stats = fs.lstatSync(path.join(instance.dir, 'content'));

        if (stats.uid !== ghostuid && stats.gid !== ghostgid) {
            // folder isn't owned by ghost user, skip additional behavior
            return Promise.resolve();
        }

        let currentuid = process.getuid();

        if (currentuid === ghostuid) {
            // current user is ghost, continue
            return Promise.resolve();
        }

        if (currentuid !== 0) {
            // we need to be sudo in order to run setuid below
            return Promise.reject(new cli.errors.SystemError('Because Ghost-CLI has set up a "ghost" system user for this instance, you must run `sudo ghost run` instead.'));
        }

        process.setgid(ghostgid);
        process.setuid(ghostuid);
    }
}

module.exports = LinuxExtension;
