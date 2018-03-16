'use strict';

const fs = require('fs-extra');
const path = require('path');
const template = require('lodash/template');

const cli = require('../../lib');
const getUid = require('./get-uid');

class SystemdExtension extends cli.Extension {
    setup(cmd, argv) {
        const instance = this.system.getInstance();

        if (!argv.local && instance.config.get('process') === 'systemd') {
            cmd.addStage('systemd', this._setup.bind(this), [], 'Systemd');
        }
    }

    _setup(argv, ctx, task) {
        const uid = getUid(ctx.instance.dir);

        // getUid returns either the uid or null
        if (!uid) {
            this.ui.log('The "ghost" user has not been created, please run `ghost setup linux-user` first', 'yellow');
            return task.skip();
        }

        const serviceFilename = `ghost_${ctx.instance.name}.service`;

        if (ctx.instance.cliConfig.get('extension.systemd', false) || fs.existsSync(path.join('/lib/systemd/system', serviceFilename))) {
            this.ui.log('Systemd service has already been set up. Skipping Systemd setup');
            return task.skip();
        }

        const service = template(fs.readFileSync(path.join(__dirname, 'ghost.service.template'), 'utf8'));

        return ctx.instance.template(service({
            name: ctx.instance.name,
            dir: process.cwd(),
            user: uid,
            environment: this.system.environment,
            ghost_exec_path: process.argv.slice(0,2).join(' ')
        }), 'systemd service', serviceFilename, '/lib/systemd/system').then(
            () => this.ui.sudo('systemctl daemon-reload')
        ).catch((error) => {
            return Promise.reject(new cli.errors.ProcessError(error));
        });
    }

    uninstall(instance) {
        const serviceFilename = `/lib/systemd/system/ghost_${instance.name}.service`;

        if (fs.existsSync(serviceFilename)) {
            return this.ui.sudo(`rm ${serviceFilename}`).catch(
                () => Promise.reject(new cli.errors.SystemError('Systemd service file link could not be removed, you will need to do this manually.'))
            );
        }

        return Promise.resolve();
    }
}

module.exports = SystemdExtension;
