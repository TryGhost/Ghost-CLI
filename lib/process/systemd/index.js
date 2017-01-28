'use strict';
const fs = require('fs-extra');
const path = require('path');
const template = require('lodash/template');
const execSync = require('child_process').execSync;

const BaseProcess = require('../index');

class SystemdProcess extends BaseProcess {
    constructor(config) {
        super(config);

        this.service = `ghost_${config.get('pname')}`;
    }

    setup(environment) {
        let service = template(fs.readFileSync(path.join(__dirname, 'ghost.service.template'), 'utf8'));
        let serviceFilename = `${this.service}.service`;

        fs.writeFileSync(path.join(process.cwd(), serviceFilename), service({
            name: this.config.get('pname'),
            dir: process.cwd(),
            user: process.getuid(),
            environment: environment,
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
        execSync(`sudo systemctl start ${this.service}`, {
            stdio: ['inherit', 'inherit', 'inherit']
        })
    }

    stop() {
        execSync(`sudo systemctl stop ${this.service}`, {
            stdio: ['inherit', 'inherit', 'inherit']
        });
    }
};

module.exports = SystemdProcess;
