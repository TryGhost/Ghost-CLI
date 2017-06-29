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
