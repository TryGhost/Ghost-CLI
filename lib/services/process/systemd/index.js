'use strict';
const fs = require('fs-extra');
const path = require('path');
const template = require('lodash/template');
const execa = require('execa');

const BaseProcess = require('../base');
const errors = require('../../../errors');

class SystemdProcess extends BaseProcess {
    init() {
        // Register hook with service manager
        this.on('setup', 'setup');
        this.on('uninstall', 'uninstall');
    }

    get systemdName() {
        let instance = this.system.getInstance();
        return `ghost_${instance.name}`;
    }

    setup() {
        let service = template(fs.readFileSync(path.join(__dirname, 'ghost.service.template'), 'utf8'));
        let serviceFilename = `${this.systemdName}.service`;
        let instance = this.system.getInstance();

        fs.writeFileSync(path.join(process.cwd(), serviceFilename), service({
            name: instance.name,
            dir: process.cwd(),
            user: process.getuid(),
            environment: this.system.environment,
            ghost_exec_path: process.argv.slice(0,2).join(' ')
        }), 'utf8');

        return this
            .config()
            .then(() => this.enable());
    }

    config() {
        return this.ui
            // moving our written template to the correct location
            .sudo(`mv ${this.systemdName}.service /lib/systemd/system`)
            .catch(() => {
                return Promise.reject(new errors.SystemError('Ghost service file could not be put in place, ensure you have proper sudo permissions and systemd is installed.'));
            });
    }

    uninstall() {
        let serviceFilename = `/lib/systemd/system/${this.systemdName}.service`;

        if (fs.existsSync(serviceFilename)) {
            return this.ui.sudo(`rm ${serviceFilename}`).catch(
                () => Promise.reject(new errors.SystemError('Ghost systemd service file could not be removed, you will need to do it manually.'))
            );
        }
    }

    enable() {
        return this.ui
            // systemctl enable tells a service to start on server boot
            .sudo(`systemctl enable ${this.systemdName}`)
            .catch((error) => Promise.reject(new errors.ProcessError(error)));
    }

    start() {
        return this.ui
            .sudo(`systemctl start ${this.systemdName}`)
            .catch((error) => Promise.reject(new errors.ProcessError(error)));
    }

    stop() {
        return this.ui
            .sudo(`systemctl stop ${this.systemdName}`)
            .catch((error) => Promise.reject(new errors.ProcessError(error)));
    }


    static willRun() {
        try {
            execa.shellSync('which systemctl', {stdio: 'ignore'});
            return true;
        } catch (e) {
            return false;
        }
    }
};

module.exports = {
    name: 'systemd',
    type: 'process',
    class: SystemdProcess
};
