'use strict';
const fs = require('fs-extra');
const path = require('path');
const fkill = require('fkill');
const spawn = require('child_process').spawn;
const assign = require('lodash/assign');
const isRunning = require('is-running');

const errors = require('../errors');
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
        let isWindows = process.platorm === 'win32';

        return new Promise((resolve, reject) => {
            let cp = spawn('node', [process.argv[1] , 'run'], {
                cwd: cwd,
                detached: true,
                // IPC doesn't work on windows, so we just use 'ignore'
                stdio: isWindows ? 'ignore' : ['ignore', 'ignore', 'ignore', 'ipc'],
                env: assign({}, process.env, {NODE_ENV: environment})
            });

            // Stick the pid into the pidfile so we can stop the process later
            fs.writeFileSync(path.join(cwd, PID_FILE), cp.pid);

            cp.on('error', reject);

            cp.on('exit', (code) => {
                fs.removeSync(path.join(cwd, PID_FILE));
                reject(new errors.GhostError(`Ghost process exited with code: ${code}`));
            });

            if (isWindows) {
                cp.disconnect();
                cp.unref();
                return resolve();
            }

            // Wait until Ghost tells us that it's started correctly, then resolve
            cp.on('message', (msg) => {
                if (msg.error) {
                    fs.removeSync(path.join(cwd, PID_FILE));

                    return reject(new errors.GhostError(msg));
                }

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
        let pid;

        try {
            pid = parseInt(fs.readFileSync(path.join(cwd, PID_FILE)));
        } catch (e) {
            if (e.code === 'ENOENT') {
                // pid was not found, exit
                return;
            }

            throw e;
        }

        return fkill(pid, {force: true}).catch((error) => {
            // TODO: verify windows outputs same error message as mac/linux
            if (!error.message.match(/No such process/)) {
                throw error;
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
        if (process.send) {process.send({started: true});}
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
        if (process.send) {process.send({error: true, message: error.message});}
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
        let pidfile = path.join(cwd, PID_FILE);

        if (!fs.existsSync(pidfile)) {
            // Even if the process exists, if the file has been deleted we really can't
            // determine if it's still running, so just assume it's not.
            return false;
        }

        let pid = parseInt(fs.readFileSync(pidfile));
        let running = isRunning(pid);

        if (!running) {
            // If not running, cleanup the pid file
            fs.removeSync(pidfile);
        }

        return running;
    }

    /**
     * Because this process manager should work on every system,
     * just return true here
     */
    static willRun() {
        return true;
    }
};

module.exports = LocalProcess;
