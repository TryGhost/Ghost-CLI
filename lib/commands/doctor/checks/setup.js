'use strict';
const os = require('os');
const chalk = require('chalk');
const execa = require('execa');
const Listr = require('listr');

module.exports = [{
    title: 'System Stack',
    task: (context) => {
        if (os.platform() !== 'linux') {
            context.linux = false;
            return Promise.reject(new Error(chalk.yellow('Platform is not Linux')));
        }

        context.linux = true;

        return execa.shell('lsb_release -a').then((result) => {
            if (!result.stdout || !result.stdout.match(/Ubuntu 16/)) {
                context.ubuntu = false;
                return Promise.reject(new Error(chalk.yellow('Linux version is not Ubuntu 16')));
            }

            context.ubuntu = true;

            return new Listr([{
                title: 'Systemd',
                task: (ctx) => execa.shell('dpkg -l | grep systemd').then(() => {
                    ctx.systemd = true;
                })
            }, {
                title: 'Nginx',
                task: (ctx) => execa.shell('dpkg -l | grep nginx').then(() => {
                    ctx.nginx = true;
                })
            }], {concurrent: true, renderer: context.verbose ? context.renderer : 'silent', exitOnError: false})
                .run(context).then(() => {
                    let errors = [];

                    if (!context.systemd) {
                        errors.push('systemd');
                    }

                    if (!context.nginx) {
                        errors.push('nginx');
                    }

                    if (errors.length) {
                        return Promise.reject(new Error(chalk.yellow(`Missing package(s): ${errors.join(', ')}`)));
                    }
                });
        });
    }
}];
