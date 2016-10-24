var BaseProcess = require('./index'),
    PID_FILE;

PID_FILE = '.ghostpid';

module.exports = BaseProcess.extend({
    name: 'local',

    start: function start(cwd, environment) {
        var fs = require('fs'),
            path = require('path'),
            spawn = require('child_process').spawn,
            cp;

        cp = spawn('ghost', ['run', '--' + environment], {
            cwd: cwd,
            detached: true,
            stdio: 'ignore',
            env: process.env
        });

        fs.writeFileSync(path.join(cwd, PID_FILE), cp.pid);
        cp.unref();
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
    }
});
