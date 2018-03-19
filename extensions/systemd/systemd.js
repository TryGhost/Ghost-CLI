'use strict';

const fs = require('fs');
const execa = require('execa');
const cli = require('../../lib');
const getUid = require('./get-uid');
const chalk = require('chalk');

class SystemdProcessManager extends cli.ProcessManager {
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
                if (error instanceof cli.errors.CliError) {
                    throw error;
                }

                throw new cli.errors.ProcessError(error);
            });
    }

    stop() {
        this._precheck();

        return this.ui.sudo(`systemctl stop ${this.systemdName}`)
            .catch((error) => Promise.reject(new cli.errors.ProcessError(error)));
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
                if (error instanceof cli.errors.CliError) {
                    throw error;
                }

                throw new cli.errors.ProcessError(error);
            });
    }

    isEnabled() {
        try {
            execa.shellSync(`sudo systemctl is-enabled ${this.systemdName}`);
            return true;
        } catch (e) {
            // Systemd prints out "disabled" if service isn't enabled
            // or "failed to get unit file state" if something else goes wrong
            if (!e.message.match(/disabled|Failed to get unit file state/)) {
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
            execa.shellSync(`sudo systemctl is-active ${this.systemdName}`);
            return true;
        } catch (e) {
            // Systemd prints out "inactive" if service isn't running
            // or "activating" if service hasn't completely started yet
            if (!e.message.match(/inactive|activating/)) {
                throw e;
            }

            return false;
        }
    }

    _precheck() {
        const uid = getUid(this.instance.dir);

        if (!uid) {
            throw new cli.errors.SystemError({
                message: 'Systemd process manager has not been set up or is corrupted.',
                help: `Run ${chalk.green('ghost setup linux-user systemd')} and try again.`
            });
        }

        if (fs.existsSync(`/lib/systemd/system/${this.systemdName}`)) {
            return;
        }

        throw new cli.errors.SystemError({
            message: 'Systemd process manager has not been set up or is corrupted.',
            help: `Run ${chalk.green('ghost setup systemd')} and try again.`
        });
    }

    static willRun() {
        try {
            execa.shellSync('which systemctl', {stdio: 'ignore'});
            return true;
        } catch (err) {
            return false;
        }
    }
}

module.exports = SystemdProcessManager;
