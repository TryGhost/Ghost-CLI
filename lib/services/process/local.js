'use strict';
const BaseProcess = require('./base');
const fs = require('fs-extra');
const path = require('path');
const fkill = require('fkill');
const spawn = require('child_process').spawn;
const assign = require('lodash/assign');

const errors = require('../../errors');

const PID_FILE = '.ghostpid';

class LocalProcess extends BaseProcess {
    start(cwd, environment) {
        return new Promise((resolve, reject) => {
            let cp = spawn('ghost', ['run'], {
                cwd: cwd,
                detached: true,
                stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
                env: assign({}, process.env, {NODE_ENV: environment})
            });

            fs.writeFileSync(path.join(cwd, PID_FILE), cp.pid);

            cp.on('error', reject);

            cp.on('exit', (code) => {
                fs.removeSync(path.join(cwd, PID_FILE));
                reject(new errors.GhostError(`Ghost process exited with code: ${code}`));
            });

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

        return fkill(pid).catch((error) => {
            // TODO: verify windows outputs same error message as mac/linux
            if (!error.message.match(/No such process/)) {
                throw error;
            }
        }).then(() => {
            fs.removeSync(path.join(cwd, PID_FILE));
        });
    }

    success() {
        if (process.send) {process.send({started: true});}
    }

    error(error) {
        if (process.send) {process.send({error: true, message: error.message});}
    }

    static willRun() {
        return true;
    }
};

module.exports = {
    name: 'local',
    type: 'process',
    class: LocalProcess
};
