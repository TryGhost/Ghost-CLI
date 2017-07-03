'use strict';

const fs = require('fs-extra');
const path = require('path');
const template = require('lodash/template');

const cli = require('../../lib');

class SystemdExtension extends cli.Extension {
    setup(cmd, argv) {
        let instance = this.system.getInstance();

        if (!argv.local && instance.config.get('process') === 'systemd') {
            cmd.addStage('systemd', this._setup.bind(this));
        }
    }

    _setup(argv, ctx) {
        let service = template(fs.readFileSync(path.join(__dirname, 'ghost.service.template'), 'utf8'));
        let serviceFilename = `ghost_${ctx.instance.name}.service`;

        return ctx.instance.template(service({
            name: ctx.instance.name,
            dir: process.cwd(),
            user: process.getuid(),
            environment: this.system.environment,
            ghost_exec_path: process.argv.slice(0,2).join(' ')
        }), 'systemd service file', serviceFilename, '/lib/systemd/system').then(() => {
            ctx.instance.cliConfig.set('extension.systemd', true).save();
        });
    }

    uninstall(instance) {
        if (!instance.cliConfig.get('extension.systemd', false)) {
            return;
        }

        let serviceFilename = `/lib/systemd/system/ghost_${instance.name}.service`;

        if (fs.existsSync(serviceFilename)) {
            return this.ui.sudo(`rm ${serviceFilename}`).catch(
                () => Promise.reject(new cli.errors.SystemError('Ghost systemd service file could not be removed, you will need to do it manually.'))
            );
        }
    }
}

module.exports = SystemdExtension;
