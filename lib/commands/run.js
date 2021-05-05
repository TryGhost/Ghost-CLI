const spawn = require('child_process').spawn;
const semver = require('semver');
const Command = require('../command');

class RunCommand extends Command {
    run() {
        const path = require('path');
        const ghostUser = require('../utils/use-ghost-user');

        // If the user is running this command directly, output a little note
        // telling them they're likely looking for `ghost start`
        if (process.stdin.isTTY) {
            this.ui.log('The `ghost run` command is used by the configured Ghost process manager and for debugging. ' +
                'If you\'re not running this to debug something, you should run `ghost start` instead.', 'yellow');
        }

        const instance = this.system.getInstance();

        if (ghostUser.shouldUseGhostUser(path.join(instance.dir, 'content'))) {
            return this.useGhostUser(instance);
        }

        return this.useDirect(instance);
    }

    useGhostUser(instance) {
        const errors = require('../errors');

        this.ui.log('+ sudo node current/index.js', 'gray');

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
        const isV4 = semver.major(instance.version) >= 4;

        this.child = spawn(process.execPath, ['current/index.js'], {
            cwd: instance.dir,
            stdio: [0, 1, 'pipe', 'ipc']
        });

        let started = false, ready = false;
        this.child.stderr.on('data', (data) => {
            if (!ready || process.stderr.isTTY) {
                process.stderr.write(data);
            }
        });

        this.child.on('error', (error) => {
            this.ui.fail(error);
            process.exit(1);
        });

        this.child.on('message', (message) => {
            if (message.started) {
                started = true;

                if (!isV4) {
                    ready = true;
                    instance.process.success();
                }

                return;
            }

            if (isV4 && message.ready) {
                ready = true;
                instance.process.success();
                return;
            }

            // NOTE: Backwards compatibility of https://github.com/TryGhost/Ghost/pull/9440
            setTimeout(() => {
                // TODO: this isV4 check *shouldn't* be required, but am too afraid to try and
                // rework this at the moment and test with v1/v2/v3, and as such this check exists
                let errMsg = isV4 ? message.error.message : message.error;
                if (isV4 && started) {
                    errMsg = `Ghost was able to start, but errored during boot with: ${errMsg}`;
                }

                instance.process.error({message: errMsg});
            }, 1000);
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
RunCommand.skipDeprecationCheck = true;

module.exports = RunCommand;
