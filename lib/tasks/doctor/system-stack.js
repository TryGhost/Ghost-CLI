'use strict';
const chalk = require('chalk');
const execa = require('execa');

const {SystemError} = require('../../errors');

const taskTitle = 'Checking operating system compatibility';

const nginxProgramName = process.env.NGINX_PROGRAM_NAME || 'nginx';

async function systemStack(ctx, task) {
    const handleError = async (message) => {
        ctx.ui.log(
            `System checks failed with message: '${message}'
Some features of Ghost-CLI may not work without additional configuration.
For local installs we recommend using \`ghost install local\` instead.`,
            'yellow'
        );

        const answer = await ctx.ui.confirm(chalk.blue('Continue anyway?'), false);
        if (answer) {
            task.skip('System stack check skipped');
            return;
        }

        throw new SystemError({
            message: `System stack checks failed with message: '${message}'`,
            task: taskTitle
        });
    };

    if (!ctx.system.platform.linux) {
        return handleError('Operating system is not Linux');
    }

    let lsbResult = {};

    try {
        lsbResult = await execa('lsb_release -a', {shell: true});
    } catch (error) {
        return handleError('Linux version is not Ubuntu 16 or 18');
    }

    if (!lsbResult.stdout || !lsbResult.stdout.match(/Ubuntu (?:16|18)/)) {
        return handleError('Linux version is not Ubuntu 16 or 18');
    }

    let promise;

        // TODO: refactor to use ctx.system.operatingSystem
        promise = execa.shell('lsb_release -a').catch(
            () => Promise.reject({message: 'Linux version is not Ubuntu 16 or 18'})
        ).then((result) => {
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
}

module.exports = {
    title: taskTitle,
    task: systemStack,
    enabled: ctx => !ctx.local && !(ctx.instance && ctx.instance.process.name === 'local'),
    skip: ctx => !ctx.isDoctorCommand && ctx.argv && !ctx.argv.stack,
    category: ['install']
};
