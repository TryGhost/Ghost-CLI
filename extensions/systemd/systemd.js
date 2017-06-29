'use strict';

const execa = require('execa');
const cli = require('../../lib');

class SystemdProcessManager extends cli.ProcessManager {
    get systemdName() {
        return `ghost_${this.instance.name}`;
    }

    start() {
        return this.ui.sudo(`systemctl start ${this.systemdName}`)
            .catch((error) => Promise.reject(new cli.errors.ProcessError(error)));
    }

    stop() {
        return this.ui.sudo(`systemctl stop ${this.systemdName}`)
            .catch((error) => Promise.reject(new cli.errors.ProcessError(error)));
    }

    isRunning() {
        try {
            execa.shellSync(`systemctl is-active ${this.systemdName}`);
            return true;
        } catch (e) {
            // systemctl is-active returns exit code 3 when a service isn't active,
            // so throw if we don't have that.
            if (e.code !== 3) {
                throw e;
            }

            return false;
        }
    }

    static willRun() {
        try {
            execa.shellSync('which systemctl', {stdio: 'ignore'});
            return true;
        } catch (e) {
            return false;
        }
    }
}

module.exports = SystemdProcessManager;
