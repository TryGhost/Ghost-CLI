'use strict';
const fs = require('fs-extra');
const path = require('path');
const template = require('lodash/template');
const execSync = require('child_process').execSync;

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

        try {
            // Because of the loading spinner, we must run this using execSync in the case
            // that the sudo command prompts for a password. Running a promisified version of exec
            // does not work in this case.
            execSync(`sudo mv ${serviceFilename} /lib/systemd/system`, {
                cwd: process.cwd(),
                stdio: ['inherit', 'inherit', 'inherit']
            });
        } catch (e) {
            return Promise.reject('Ghost service file could not be put in place, ensure you have proper sudo permissions and systemd is installed.');
        }
    }

    start() {
        execSync(`sudo systemctl start ${this.systemdName}`, {
            stdio: ['inherit', 'inherit', 'inherit']
        })
    }

    stop() {
        execSync(`sudo systemctl stop ${this.systemdName}`, {
            stdio: ['inherit', 'inherit', 'inherit']
        });
    }

    static willRun() {
        try {
            execSync('which systemctl', {stdio: 'ignore'});
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
