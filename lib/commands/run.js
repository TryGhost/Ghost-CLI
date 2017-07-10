'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const execa = require('execa');
const spawn = require('child_process').spawn;
const errors = require('../errors');
const Command = require('../command');

class RunCommand extends Command {
    run() {
        // If the user is running this command directly, output a little note
        // telling them they're likely looking for `ghost start`
        if (process.stdin.isTTY) {
            this.ui.log('The `ghost run` command is used by the configured Ghost process manager and for debugging. ' +
                'If you\'re not running this to debug something, you should run `ghost start` instead.', 'yellow');
        }

        let instance = this.system.getInstance();

        if (!instance.config.has('paths.contentPath')) {
            instance.config.set('paths.contentPath', path.join(instance.dir, 'content')).save();
        }

        if (os.platform() !== 'linux') {
            // platform isn't linux, we don't need to to anything
            return this.useDirect(instance);
        }

        let ghostuid, ghostgid;

        try {
            ghostuid = execa.shellSync('id -u ghost').stdout;
            ghostgid = execa.shellSync('id -g ghost').stdout;
        } catch (e) {
            if (!e.message.match(/no such user/)) {
                return Promise.reject(new errors.ProcessError(e));
            }

            // Ghost user doesn't exist, use direct
            return this.useDirect(instance);
        }

        ghostuid = parseInt(ghostuid);
        ghostgid = parseInt(ghostgid);

        let stats = fs.lstatSync(path.join(instance.dir, 'content'));

        if (stats.uid !== ghostuid && stats.gid !== ghostgid) {
            // folder isn't owned by ghost user, use direct
            return this.useDirect(instance);
        }

        let currentuid = process.getuid();

        // This is important for systemd, as it will run this as the ghost user
        if (currentuid === ghostuid) {
            // current user is ghost, use direct
            return this.useDirect(instance);
        }

        return this.useGhostUser(instance);
    }

    useGhostUser(instance) {
        this.ui.log('Running sudo command: node current/index.js', 'gray');

        this.child = spawn('sudo', `-E -u ghost ${process.execPath} current/index.js`.split(' '), {
            cwd: instance.dir,
            stdio: 'inherit'
        });

        this.child.on('error', (error) => {
            if (error.code !== 'EPERM') {
                this.ui.fail(error);
                process.exit(1);
            }
        });

        this.child.on('message', (message) => {
            // we still want to catch errors from Ghost here,
            // but we don't need the additional instance.process functionality
            if (message.error) {
                throw new errors.GhostError(message.error);
            }
        });
        this.sudo = true;
    }

    useDirect(instance) {
        this.child = spawn(process.execPath, ['current/index.js'], {
            cwd: instance.dir,
            stdio: [0, 1, 2, 'ipc']
        });

        this.child.on('error', (error) => {
            this.ui.fail(error);
            process.exit(1);
        });

        this.child.on('message', (message) => {
            if (message.started) {
                instance.process.success();
                return;
            }

            instance.process.error(message.error);
        });
    }

    cleanup() {
        if (!this.child) {
            return;
        }

        try {
            this.child.kill();
        } catch (e) {
            if (!this.sudo || e.code !== 'EPERM') {
                throw e;
            }
        }
    }
}

RunCommand.description = 'Run a Ghost instance directly (used by process managers and for debugging)';

module.exports = RunCommand;
