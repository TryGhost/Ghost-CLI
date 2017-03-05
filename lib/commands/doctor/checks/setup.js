'use strict';
const os = require('os');
const chalk = require('chalk');
const execa = require('execa');
const Listr = require('listr');

const errors = require('../../../errors');

module.exports = [{
    title: 'System Stack',
    task: (context) => {
        if (os.platform() !== 'linux') {
            context.linux = false;
            return Promise.reject(new errors.SystemError(chalk.yellow('Platform is not Linux')));
        }

        context.linux = true;

        return execa.shell('lsb_release -a').then((result) => {
            if (!result.stdout || !result.stdout.match(/Ubuntu 16/)) {
                context.ubuntu = false;
                return Promise.reject(new errors.SystemError(chalk.yellow('Linux version is not Ubuntu 16')));
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
                .run(context).catch(() => {
                    let errors = [];

                    if (!context.systemd) {
                        errors.push('systemd');
                    }

                    if (!context.nginx) {
                        errors.push('nginx');
                    }

                    if (errors.length) {
                        return Promise.reject(new errors.SystemError(chalk.yellow(`Missing package(s): ${errors.join(', ')}`)));
                    }
                });
        }).catch((error) => {
            // If the error caught is not a SystemError, something went wrong with execa,
            // so throw a ProcessError instead
            if (!(error instanceof errors.SystemError)) {
                return Promise.reject(new errors.ProcessError(error));
            }
        });
    }
}];
