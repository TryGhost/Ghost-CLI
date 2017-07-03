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

    restart() {
        return this.ui.sudo(`systemctl restart ${this.systemdName}`)
            .catch((error) => Promise.reject(new cli.errors.ProcessError(error)));
    }

    isEnabled() {
        try {
            execa.shellSync(`systemctl is-enabled ${this.systemdName}`);
            return true;
        } catch (e) {
            // Systemd prints out "disabled" if service isn't enabled
            if (!e.message.match(/disabled/)) {
                throw e;
            }

            return false;
        }
    }

    enable() {
        return this.ui.sudo(`systemctl enable ${this.systemdName} --quiet`)
            .catch((error) => Promise.reject(new cli.errors.ProcessError(error)));
    }

    disable() {
        return this.ui.sudo(`systemctl disable ${this.systemdName} --quiet`)
            .catch((error) => Promise.reject(new cli.errors.ProcessError(error)));
    }

    isRunning() {
        try {
            execa.shellSync(`systemctl is-active ${this.systemdName}`);
            return true;
        } catch (e) {
            // Systemd prints out "inactive" if service isn't running
            if (!e.message.match(/inactive/)) {
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
