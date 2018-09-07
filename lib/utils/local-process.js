'use strict';
const fs = require('fs-extra');
const path = require('path');

const ProcessManager = require('../process-manager');

const PID_FILE = '.ghostpid';

/**
 * Local process manager. This is pretty much guaranteed to work on any OS and
 * system, so it is used as the fallback if any other process manager doesn't work
 *
 * @class LocalProcess
 */
class LocalProcess extends ProcessManager {
    /**
     * Starts the local process
     *
     * @param {string} cwd CWD of the ghost instance
     * @param {string} environment Current running environment
     * @return Promise<void>
     *
     * @method start
     * @public
     */
    start(cwd, environment) {
        const childProcess = require('child_process');
        const errors = require('../errors');

        // Check that content folder is owned by the current user
        if (!this._checkContentFolder(cwd)) {
            return Promise.reject(new errors.SystemError(`The content folder is not owned by the current user.
Ensure the content folder has correct permissions and try again.`));
        }

        return new Promise((resolve, reject) => {
            const cp = childProcess.spawn('node', [process.argv[1] , 'run'], {
                cwd: cwd,
                detached: true,
                stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
                env: Object.assign({}, process.env, {NODE_ENV: environment})
            });

            // Stick the pid into the pidfile so we can stop the process later
            fs.writeFileSync(path.join(cwd, PID_FILE), cp.pid);

            cp.on('error', (error) => {
                reject(new errors.CliError({
                    message: 'An error occurred while starting Ghost.',
                    err: error
                }));
            });

            cp.on('exit', (code) => {
                fs.removeSync(path.join(cwd, PID_FILE));
                reject(new errors.GhostError(`Ghost process exited with code: ${code}`));
            });

            // Wait until Ghost tells us that it's started correctly, then resolve
            cp.on('message', (msg) => {
                if (msg.error) {
                    fs.removeSync(path.join(cwd, PID_FILE));
                    return reject(new errors.GhostError(msg.message));
                }

                /* istanbul ignore else */
                if (msg.started) {
                    cp.disconnect();
                    cp.unref();
                    return resolve();
                }
            });
        });
    }

    /**
     * Stops an instance
     *
     * @param {string} cwd Current working directory
     * @return Promise<void>
     *
     * @method stop
     * @public
     */
    stop(cwd) {
        const fkill = require('fkill');
        const errors = require('../errors');

        let pid;

        try {
            pid = parseInt(fs.readFileSync(path.join(cwd, PID_FILE)));
        } catch (e) {
            if (e.code === 'ENOENT') {
                // pid was not found, exit
                return Promise.resolve();
            }

            return Promise.reject(new errors.CliError({
                message: 'An unexpected error occurred when reading the pidfile.',
                error: e
            }));
        }

        return fkill(pid, {force: this.system.platform.windows}).catch((error) => {
            // TODO: verify windows outputs same error message as mac/linux
            if (!error.message.match(/No such process/)) {
                return Promise.reject(new errors.CliError({
                    message: 'An unexpected error occurred while stopping Ghost.',
                    err: error
                }));
            }
        }).then(() => {
            fs.removeSync(path.join(cwd, PID_FILE));
        });
    }

    /**
     * Called by the `ghost run` sub-process, this notifies the parent process that
     * Ghost has started
     *
     * @method success
     * @public
     */
    success() {
        /* istanbul ignore else */
        if (process.send) {
            process.send({started: true});
        }
    }

    /**
     * Called by the `ghost run` sub-process, this notifies the parent process
     * that an error has occurred.
     *
     * @param {Error} error
     *
     * @method error
     * @public
     */
    error(error) {
        /* istanbul ignore else */
        if (process.send) {
            process.send({error: true, message: error.message});
        }
    }

    /**
     * Checks if the Ghost instance is running
     *
     * @param {string} cwd
     * @return bool Whether or not the process is still running
     *
     * @method isRunning
     * @public
     */
    isRunning(cwd) {
        const isRunning = require('is-running');

        const pidfile = path.join(cwd, PID_FILE);

        if (!fs.existsSync(pidfile)) {
            // Even if the process exists, if the file has been deleted we really can't
            // determine if it's still running, so just assume it's not.
            return false;
        }

        const pid = parseInt(fs.readFileSync(pidfile));
        const running = isRunning(pid);

        if (!running) {
            // If not running, cleanup the pid file
            fs.removeSync(pidfile);
        }

        return running;
    }

    /**
     * Check that the content folder is owned by the current user
     *
     * @param {String} cwd current working directory
     * @return {Boolean} true if ownership is correct, otherwise false
     */
    _checkContentFolder(cwd) {
        if (this.system.platform.windows) {
            return true;
        }

        const stat = fs.lstatSync(path.join(cwd, 'content'));

        if (stat.uid === process.getuid()) {
            return true;
        }

        const Mode = require('stat-mode');
        const mode = new Mode(stat);
        return mode.others.write && mode.others.read;
    }

    /**
     * Because this process manager should work on every system,
     * just return true here
     */
    static willRun() {
        return true;
    }
}

module.exports = LocalProcess;
