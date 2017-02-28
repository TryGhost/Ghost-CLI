'use strict';
const fs = require('fs-extra');
const path = require('path');
const template = require('lodash/template');
const execa = require('execa');

const BaseProcess = require('../base');

class SystemdProcess extends BaseProcess {
    init() {
        // Register hook with service manager
        this.on('setup', 'setup');
    }

    get systemdName() {
        return `ghost_${this.config.get('pname')}`;
    }

    setup() {
        let service = template(fs.readFileSync(path.join(__dirname, 'ghost.service.template'), 'utf8'));
        let serviceFilename = `${this.systemdName}.service`;

        fs.writeFileSync(path.join(process.cwd(), serviceFilename), service({
            name: this.config.get('pname'),
            dir: process.cwd(),
            user: process.getuid(),
            environment: this.config.environment,
            ghost_exec_path: process.argv.slice(0,2).join(' ')
        }), 'utf8');

        return this.ui.noSpin(execa.shell(`sudo mv ${serviceFilename} /lib/systemd/system`, {stdio: 'inherit'}).catch(() => {
            return Promise.reject('Ghost service file could not be put in place, ensure you have proper sudo permissions and systemd is installed.');
        }));
    }

    start() {
        return this.ui.noSpin(execa.shell(`sudo systemctl start ${this.systemdName}`, {stdio: 'inherit'}));
    }

    stop() {
        return this.ui.noSpin(execa.shell(`sudo systemctl stop ${this.systemdName}`, {stdio: 'inherit'}));
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
