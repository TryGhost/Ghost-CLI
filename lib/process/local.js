var BaseProcess = require('./index'),
    PID_FILE;

PID_FILE = '.ghostpid';

module.exports = BaseProcess.extend({
    name: 'local',

    start: function start(cwd, environment) {
        var fs = require('fs'),
            path = require('path'),
            assign = require('lodash/assign'),
            spawn = require('child_process').spawn,
            Promise = require('bluebird'),
            cp;

        return new Promise(function (resolve, reject) {
            cp = spawn('ghost', ['run'], {
                cwd: cwd,
                detached: true,
                stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
                env: assign({NODE_ENV: environment}, process.env)
            });

            fs.writeFileSync(path.join(cwd, PID_FILE), cp.pid);

            cp.on('message', function (msg) {
                if (msg.error) {
                    fs.unlinkSync(path.join(cwd, PID_FILE));

                    reject(msg.error);
                }

                if (msg.started) {
                    cp.disconnect();
                    cp.unref();
                    resolve();
                }
            });
        });
    },

    stop: function stop(cwd) {
        var fs = require('fs'),
            path = require('path'),
            fkill = require('fkill'),
            pid;

        try {
            pid = parseInt(fs.readFileSync(path.join(cwd, PID_FILE)));
        } catch (e) {
            if (e.errno === 'ENOENT') {
                // pid was not found, exit
                return;
            }

            throw e;
        }

        return fkill(pid).catch(function (error) {
            // TODO: verify windows outputs same error message as macOS
            if (!error.message.match(/No such process/)) {
                throw error;
            }
        }).then(function () {
            fs.unlinkSync(path.join(cwd, PID_FILE));
        });
    },

    success: function success() {
        if (process.send) {
            process.send({started: true});
        }
    },

    error: function error(error) {
        if (process.send) {
            process.send({error: true, message: error.message});
        }
    }
});
