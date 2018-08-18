'use strict';

const fs = require('fs');
const execa = require('execa');
const getUid = require('./get-uid');
const chalk = require('chalk');
const {ProcessManager, errors} = require('../../lib');

const {CliError, ProcessError, SystemError} = errors;

class SystemdProcessManager extends ProcessManager {
    get systemdName() {
        return `ghost_${this.instance.name}`;
    }

    get logSuggestion() {
        return `journalctl -u ${this.systemdName} -n 50`;
    }

    start() {
        this._precheck();
        const {logSuggestion} = this;

        const portfinder = require('portfinder');
        const socketAddress = {
            port: null,
            host: 'localhost'
        };

        return portfinder.getPortPromise()
            .then((port) => {
                socketAddress.port = port;
                this.instance.config.set('bootstrap-socket', socketAddress);
                return this.instance.config.save();
            })
            .then(() => this.ui.sudo(`systemctl start ${this.systemdName}`))
            .then(() => this.ensureStarted({logSuggestion, socketAddress}))
            .catch((error) => {
                if (error instanceof CliError) {
                    throw error;
                }

                throw new ProcessError(error);
            });
    }

    stop() {
        this._precheck();

        return this.ui.sudo(`systemctl stop ${this.systemdName}`).catch((error) => {
            throw new ProcessError(error);
        });
    }

    restart() {
        this._precheck();
        const {logSuggestion} = this;

        const portfinder = require('portfinder');
        const socketAddress = {
            port: null,
            host: 'localhost'
        };

        return portfinder.getPortPromise()
            .then((port) => {
                socketAddress.port = port;
                this.instance.config.set('bootstrap-socket', socketAddress);
                return this.instance.config.save();
            })
            .then(() => this.ui.sudo(`systemctl restart ${this.systemdName}`))
            .then(() => this.ensureStarted({logSuggestion, socketAddress}))
            .catch((error) => {
                if (error instanceof CliError) {
                    throw error;
                }

                throw new ProcessError(error);
            });
    }

    isEnabled() {
        return this.ui.sudo(`systemctl is-enabled ${this.systemdName}`)
            .then(() => true)
            .catch((error) => {
                // Systemd prints out "disabled" if service isn't enabled
                // or "failed to get unit file state" if something else goes wrong
                if (!error.message.match(/disabled|Failed to get unit file state/)) {
                    throw error;
                }

                return false;
            });
    }

    enable() {
        return this.ui.sudo(`systemctl enable ${this.systemdName} --quiet`).catch((error) => {
            throw new ProcessError(error);
        });
    }

    disable() {
        return this.ui.sudo(`systemctl disable ${this.systemdName} --quiet`).catch((error) => {
            throw new ProcessError(error);
        });
    }

    isRunning() {
        return this.ui.sudo(`systemctl is-active ${this.systemdName}`)
            .then(() => true)
            .catch((error) => {
                // Systemd prints out "inactive" if service isn't running
                // or "activating" if service hasn't completely started yet
                if (error.stdout && error.stdout.match(/inactive|activating/)) {
                    return false;
                }

                // Systemd service is in "failed" state, meaning Ghost failed to start.
                // In this case, we should reset the failed state and return false, so that
                // the user gets the chance to try starting again
                if (error.stdout && error.stdout.match(/failed/)) {
                    return this.ui.sudo(`systemctl reset-failed ${this.systemdName}`)
                        .then(() => false)
                        .catch((error) => {
                            throw new ProcessError(error);
                        });
                }

                throw new ProcessError(error);
            });
    }

    _precheck() {
        const uid = getUid(this.instance.dir);

        // getUid returns either the uid or null
        if (!uid) {
            throw new SystemError({
                message: 'Systemd process manager has not been set up or is corrupted.',
                help: `Run ${chalk.green('ghost setup linux-user systemd')} and try again.`
            });
        }

        if (fs.existsSync(`/lib/systemd/system/${this.systemdName}.service`)) {
            return;
        }

        throw new SystemError({
            message: 'Systemd process manager has not been set up or is corrupted.',
            help: `Run ${chalk.green('ghost setup systemd')} and try again.`
        });
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
