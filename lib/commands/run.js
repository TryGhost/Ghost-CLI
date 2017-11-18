'use strict';
const fs = require('fs-extra');
const path = require('path');
const spawn = require('child_process').spawn;
const Command = require('../command');

class RunCommand extends Command {
    run() {
        const shouldUseGhostUser = require('../utils/use-ghost-user');

        // If the user is running this command directly, output a little note
        // telling them they're likely looking for `ghost start`
        if (process.stdin.isTTY) {
            this.ui.log('The `ghost run` command is used by the configured Ghost process manager and for debugging. ' +
                'If you\'re not running this to debug something, you should run `ghost start` instead.', 'yellow');
        }

        this.instance = this.system.getInstance();

        if (!this.instance.config.has('paths.contentPath')) {
            this.instance.config.set('paths.contentPath', path.join(this.instance.dir, 'content')).save();
        }

        if (shouldUseGhostUser(path.join(this.instance.dir, 'content'))) {
            return this.useGhostUser(this.instance);
        }

        return this.useDirect(this.instance);
    }

    useGhostUser(instance) {
        const errors = require('../errors');

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

            this.writeEnvironment();
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
                this.writeEnvironment();

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

            this.writeEnvironment(true);
        } catch (e) {
            if (!this.sudo || e.code !== 'EPERM') {
                throw e;
            }
        }
    }

    writeEnvironment(remove) {
        const environmentPath = path.join(this.instance.dir, 'content/.environment');

        if (remove) {
            fs.removeSync(environmentPath);
            return;
        }

        fs.writeFileSync(environmentPath, this.system.environment, {encoding: 'utf8'});
    }
}

RunCommand.description = 'Run a Ghost instance directly (used by process managers and for debugging)';

module.exports = RunCommand;
