'use strict';
const chalk = require('chalk');
const execa = require('execa');

const errors = require('../../../errors');

const taskTitle = 'Checking operating system compatibility';

const nginxProgramName = process.env.NGINX_PROGRAM_NAME || 'nginx';

function systemStack(ctx, task) {
    let promise;

    if (!ctx.system.platform.linux) {
        promise = Promise.reject({message: 'Operating system is not Linux'});
    } else {
        // TODO: refactor to use ctx.system.operatingSystem
        promise = execa.shell('lsb_release -a').catch(
            () => Promise.reject({message: 'Linux version is not Ubuntu 16 or 18'})
        ).then((result) => {
            if (!result.stdout || !result.stdout.match(/Ubuntu (?:16|18)/)) {
                return Promise.reject({message: 'Linux version is not Ubuntu 16 or 18'});
            }

            return ctx.ui.listr([{
                title: 'Checking systemd is installed',
                task: () => execa.shell('dpkg -l | grep systemd')
                    .catch(() => Promise.reject({missing: 'systemd'}))
            }, {
                title: `Checking ${nginxProgramName} is installed`,
                task: () => execa.shell(`dpkg -l | grep ${nginxProgramName}`)
                    .catch(() => Promise.reject({missing: nginxProgramName}))
            }], ctx, {
                concurrent: true,
                exitOnError: false,
                renderer: ctx.ui.verbose ? 'verbose' : 'silent'
            }).catch(error => Promise.reject({
                message: `Missing package(s): ${error.errors.map(e => e.missing).join(', ')}`
            }));
        });
    }

    return promise.catch((error) => {
        ctx.ui.log(
            `System checks failed with message: '${error.message}'
Some features of Ghost-CLI may not work without additional configuration.
For local installs we recommend using \`ghost install local\` instead.`,
            'yellow'
        );

        return ctx.ui.confirm(chalk.blue('Continue anyway?'), false).then((confirmed) => {
            if (confirmed) {
                task.skip('System stack check skipped');
                return Promise.resolve();
            }

            return Promise.reject(new errors.SystemError({
                message: `System stack checks failed with message: '${error.message}'`,
                task: taskTitle
            }));
        });
    });
}

module.exports = {
    title: taskTitle,
    task: systemStack,
    enabled: ctx => !ctx.local && !(ctx.instance && ctx.instance.process.name === 'local'),
    skip: ctx => !ctx.isDoctorCommand && ctx.argv && !ctx.argv.stack,
    category: ['install']
};
