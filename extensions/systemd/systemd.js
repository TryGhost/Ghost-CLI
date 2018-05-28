'use strict';

const fs = require('fs');
const execa = require('execa');
const getUid = require('./get-uid');
const chalk = require('chalk');
const {ProcessManager, errors} = require('../../lib');

class SystemdProcessManager extends ProcessManager {
    get systemdName() {
        return `ghost_${this.instance.name}`;
    }

    get logSuggestion() {
        return `journalctl -u ${this.systemdName} -n 50`;
    }

    start() {
        this._precheck();

        return this.ui.sudo(`systemctl start ${this.systemdName}`)
            .then(() => {
                return this.ensureStarted({
                    logSuggestion: this.logSuggestion
                });
            })
            .catch((error) => {
                if (error instanceof errors.CliError) {
                    throw error;
                }

                throw new errors.ProcessError(error);
            });
    }

    stop() {
        this._precheck();

        return this.ui.sudo(`systemctl stop ${this.systemdName}`)
            .catch((error) => Promise.reject(new errors.ProcessError(error)));
    }

    restart() {
        this._precheck();

        return this.ui.sudo(`systemctl restart ${this.systemdName}`)
            .then(() => {
                return this.ensureStarted({
                    logSuggestion: this.logSuggestion
                });
            })
            .catch((error) => {
                if (error instanceof errors.CliError) {
                    throw error;
                }

                throw new errors.ProcessError(error);
            });
    }

    isEnabled() {
        return this.ui.sudo(`systemctl is-enabled ${this.systemdName}`)
            .then(() => Promise.resolve(true))
            .catch((error) => {
                // Systemd prints out "disabled" if service isn't enabled
                // or "failed to get unit file state" if something else goes wrong
                if (!error.message.match(/disabled|Failed to get unit file state/)) {
                    return Promise.reject(error);
                }

                return Promise.resolve(false);
            });
    }

    enable() {
        return this.ui.sudo(`systemctl enable ${this.systemdName} --quiet`)
            .catch((error) => Promise.reject(new errors.ProcessError(error)));
    }

    disable() {
        return this.ui.sudo(`systemctl disable ${this.systemdName} --quiet`)
            .catch((error) => Promise.reject(new errors.ProcessError(error)));
    }

    isRunning() {
        return this.ui.sudo(`systemctl is-active ${this.systemdName}`)
            .then(() => Promise.resolve(true))
            .catch ((error) => {
                // Systemd prints out "inactive" if service isn't running
                // or "activating" if service hasn't completely started yet
                if (!error.message.match(/inactive|activating/)) {
                    return Promise.reject(new errors.ProcessError(error));
                }
                return Promise.resolve(false);
            });
    }

    _precheck() {
        const uid = getUid(this.instance.dir);

        // getUid returns either the uid or null
        if (!uid) {
            throw new errors.SystemError({
                message: 'Systemd process manager has not been set up or is corrupted.',
                help: `Run ${chalk.green('ghost setup linux-user systemd')} and try again.`
            });
        }

        if (fs.existsSync(`/lib/systemd/system/${this.systemdName}.service`)) {
            return;
        }

        throw new errors.SystemError({
            message: 'Systemd process manager has not been set up or is corrupted.',
            help: `Run ${chalk.green('ghost setup systemd')} and try again.`
        });
    }

    createGhostUser() {
        return true;
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
