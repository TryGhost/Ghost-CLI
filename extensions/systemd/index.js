'use strict';

const fs = require('fs-extra');
const path = require('path');
const template = require('lodash/template');

const cli = require('../../lib');

class SystemdExtension extends cli.Extension {
    get systemdName() {
        let instance = this.system.getInstance();
        return `ghost_${instance.name}`;
    }

    setup(cmd, argv) {
        let instance = this.system.getInstance();

        if (!argv.local && instance.config.get('process') === 'systemd') {
            cmd.addStage('systemd', this._setup.bind(this));
        }
    }

    _setup() {
        let service = template(fs.readFileSync(path.join(__dirname, 'ghost.service.template'), 'utf8'));
        let serviceFilename = `${this.systemdName}.service`;
        let instance = this.system.getInstance();

        return instance.template(service({
            name: instance.name,
            dir: process.cwd(),
            user: process.getuid(),
            environment: this.system.environment,
            ghost_exec_path: process.argv.slice(0,2).join(' ')
        }), 'systemd service file', serviceFilename, '/lib/systemd/system').then(() => {
            instance.cliConfig.set('extension.systemd', true).save();
        });
    }

    uninstall() {
        let instance = this.system.getInstance();

        if (!instance.cliConfig.get('extension.systemd', false)) {
            return;
        }

        let serviceFilename = `/lib/systemd/system/${this.systemdName}.service`;

        if (fs.existsSync(serviceFilename)) {
            return this.ui.sudo(`rm ${serviceFilename}`).catch(
                () => Promise.reject(new cli.errors.SystemError('Ghost systemd service file could not be removed, you will need to do it manually.'))
            );
        }
    }
}

module.exports = SystemdExtension;
