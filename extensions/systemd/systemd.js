'use strict';

const fs = require('fs');
const execa = require('execa');
const cli = require('../../lib');

class SystemdProcessManager extends cli.ProcessManager {
    get systemdName() {
        return `ghost_${this.instance.name}`;
    }

    start() {
        if (!this._precheck()) {
            return Promise.reject(
                new cli.errors.SystemError('Systemd process manager has not been set up. Run `ghost setup systemd` and try again.')
            );
        }

        return this.ui.sudo(`systemctl start ${this.systemdName}`)
            .catch((error) => Promise.reject(new cli.errors.ProcessError(error)));
    }

    stop() {
        if (!this._precheck()) {
            return Promise.reject(
                new cli.errors.SystemError('Systemd process manager has not been set up. Run `ghost setup systemd` and try again.')
            );
        }

        return this.ui.sudo(`systemctl stop ${this.systemdName}`)
            .catch((error) => Promise.reject(new cli.errors.ProcessError(error)));
    }

    restart() {
        if (!this._precheck()) {
            return Promise.reject(
                new cli.errors.SystemError('Systemd process manager has not been set up. Run `ghost setup systemd` and try again.')
            );
        }

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

    _precheck() {
        if (this.instance.cliConfig.get('extension.systemd', false)) {
            return true;
        }

        // service file exists but for some reason the right property in cliConfig hasn't been set
        if (fs.existsSync(`/lib/systemd/system/${this.systemdName}.service`)) {
            this.instance.cliConfig.set('extension.systemd', true);
            return true;
        }

        return false;
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
