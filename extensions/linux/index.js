'use strict';

const os = require('os');
const execa = require('execa');

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

        try {
            execa.shellSync('id ghost');
            this.ui.log('Ghost user already exists', 'cyan');
            return task.skip();
        } catch (e) {
            if (!e.message.match(/no such user/)) {
                return Promise.reject(e);
            }
        }

        return this.ui.listr([{
            title: 'Creating ghost system user',
            task: () => this.ui.sudo('useradd --system --user-group ghost')
        }, {
            title: 'Changing directory permissions',
            task: () => this.ui.sudo(`chown -R ghost:ghost ${ctx.instance.dir}`)
        }, {
            title: 'Adding current user to ghost group',
            task: (ctx) => {
                return execa.shell('id -un').then((result) => {
                    ctx.currentuser = result.stdout;
                    return this.ui.sudo(`gpasswd --add ${ctx.currentuser} ghost`);
                });
            }
        }], false);
    }
}

module.exports = LinuxExtension;
