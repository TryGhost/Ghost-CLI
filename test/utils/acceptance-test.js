// Borrowed idea from denali's (denali-js/denali) acceptance test helpers
// License re-printed here:
/*
    Copyright 2016 Dave Wasmer

    Permission is hereby granted, free of charge, to any person obtaining
    a copy of this software and associated documentation files (the
    "Software"), to deal in the Software without restriction, including
    without limitation the rights to use, copy, modify, merge, publish,
    distribute, sublicense, and/or sell copies of the Software, and to
    permit persons to whom the Software is furnished to do so, subject to
    the following conditions:

    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
    LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
    OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
    WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
'use strict';
const cp = require('child_process');
const tmp = require('tmp');
const find = require('lodash/find');
const path = require('path');
const {setupTestFolder} = require('./test-folder');

global.Promise = require('bluebird');

module.exports = class AcceptanceTest {
    constructor(command, options) {
        options = options || {};

        this.command = command;
        this.dir = options.dir || tmp.dirSync({unsafeCleanup: true}).name;
        this.cliPath = path.join(process.cwd(), 'bin', 'ghost');
    }

    setup(type) {
        this.cleanupDir = setupTestFolder(type, this.dir).cleanup;
    }

    path(file) {
        return path.join(this.dir, file);
    }

    /**
     * Runs the particular AcceptanceTest command without parsing contents
     * Returns a promise that resolves when the command succeeds, or rejects if
     * a) the command fails, or b) options.failOnStdErr is set to true and output
     * is rendered to stdErr
     *
     * @param {Object} options options
     *                         - failOnStdErr: fail if stderr is written to
     *                         - env: environment variables to pass to the process
     *
     * @return {Promise} Promise that resolves if the command succeeds, otherwise rejects
     */
    run(options) {
        options = options || {};

        return new Promise((resolve, reject) => {
            cp.exec(`${this.cliPath} ${this.command}`, {
                env: Object.assign({}, process.env, options.env || {}),
                cwd: this.dir
            }, (err, stdout, stderr) => {
                if (err || (options.failOnStdErr && stderr.length > 0)) {
                    err = err || new Error('\n');
                    err.message += `'ghost ${this.command}' failed\ncwd: ${this.cwd}\n` +
                        `stdout:\n ${stdout} \nstderr: ${stderr}`;
                    reject(err);
                } else {
                    resolve({
                        stdout: stdout,
                        stderr: stderr,
                        dir: this.dir
                    });
                }
            });
        });
    }

    /**
     * Invoke the command and poll the output every options.pollInterval. Useful for commands that
     * have a definitely completion (i.e. 'build', not 'serve'). Each poll of the output will run the
     * supplied options.checkOutput method, passing in the stdout and stderr buffers. If the
     * options.checkOutput method returns a truthy value, the returned promise will resolve.
     * Otherwise, it will continue to poll the output until options.timeout elapses, after which the
     * returned promsie will reject.
     *
     * @param {Boolean} options.failOnStderr Should any output to stderr result in a rejected promise?
     * @param {Function} options.checkOutput A function invoked with the stdout and stderr buffers of the invoked
     *                            command, and should return true if the output passes
     *
     * @return {Promise} Promise for the command
     */
    spawn(options) {
        options = options || {};

        return new Promise((resolve, reject) => {
            this.spawnedCommand = cp.spawn(this.cliPath, this.command.split(' '), {
                env: Object.assign({}, process.env, {
                    NODE_ENV: options.environment || 'production'
                }, options.env || {}),
                cwd: this.dir,
                stdio: 'pipe'
            });

            // Cleanup spawned processes if our process is killed
            const cleanup = this.cleanup.bind(this);
            process.on('exit', cleanup.bind(this));

            // Buffer up the output so the polling timer can check it
            let stdoutBuffer = '';
            let stderrBuffer = '';
            this.spawnedCommand.stdout.on('data', (d) => {
                const chunk = d.toString();

                if (options.stdin) {
                    const stdin = find(options.stdin, obj => obj.when.test(chunk));

                    if (stdin) {
                        this.spawnedCommand.stdin.write(`${stdin.write}\n`);
                    }
                }

                stdoutBuffer += chunk;
            });
            this.spawnedCommand.stderr.on('data', (d) => {
                stderrBuffer += d.toString();
            });

            // Handle errors from the child process
            this.spawnedCommand.stdout.on('error', reject);
            this.spawnedCommand.stderr.on('error', reject);
            this.spawnedCommand.on('error', reject);
            this.spawnedCommand.on('exit', () => {
                process.removeListener('exit', cleanup);
                this.cleanup();

                if (options.rejectOnExit) {
                    const message = `Command 'ghost ${this.command}' exited before matching the checkOutput function.\n` +
                        `stdout: ${stdoutBuffer} \nstderr: ${stderrBuffer}`;
                    reject(new Error(message));
                    return;
                }

                resolve({
                    stdout: stdoutBuffer,
                    stderr: stderrBuffer,
                    dir: this.dir
                });
            });

            // Poll periodically to check the results
            this.pollOutput = setInterval(() => {
                if (stderrBuffer.length > 0 && options.failOnStderr) {
                    process.removeListener('exit', cleanup);
                    this.cleanup();
                    const error = new Error(`'${this.command}' printed to stderr with failOnStderr enabled:\n`);
                    error.message += `cwd: ${this.dir} \nstdout: ${stdoutBuffer} \nstderr: ${stderrBuffer};`;
                    reject(error);
                }
                const passed = options.checkOutput(stdoutBuffer, stderrBuffer, this.dir);
                if (passed) {
                    process.removeListener('exit', cleanup);
                    this.cleanup();
                    resolve();
                }
            }, options.pollInterval || 50);

            // Ensure the test fails if we don't pass the test after a while
            const timeout = options.timeout || (process.env.CI ? 5 * 60000 : 3 * 60000);

            this.fallbackTimeout = setTimeout(() => {
                process.removeListener('exit', cleanup);
                this.cleanup();
                let message = `Timeout of ${(timeout / 1000) / 60} minutes exceeded for spawned command: ${this.command}\n`;

                message += `stdout: ${stdoutBuffer} \nstderr: ${stderrBuffer}`;
                reject(new Error(message));
            }, timeout);
        });
    }

    /**
     * Internal cleanup method to clean up timers and processes.
     */
    cleanup() {
        this.spawnedCommand.kill();
        clearInterval(this.pollOutput);
        clearTimeout(this.fallbackTimeout);
    }
};
