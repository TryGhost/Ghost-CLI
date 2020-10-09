const chalk = require('chalk');
const sysinfo = require('systeminformation');

const {SystemError} = require('../../../errors');

const taskTitle = 'Checking system compatibility';
const nginxProgramName = process.env.NGINX_PROGRAM_NAME || 'nginx';
const versionRegex = /^(?:16|18|20)/;

async function hasService(name) {
    try {
        const services = await sysinfo.services(name);
        return services.some(s => s.name === name && s.running);
    } catch (error) {
        return false;
    }
}

async function checkSystem(ctx) {
    if (!ctx.system.platform.linux) {
        throw new Error('Operating system is not Linux');
    }

    const {distro, release} = await sysinfo.osInfo();
    if (distro !== 'Ubuntu' || !versionRegex.test(release)) {
        throw new Error('Linux version is not Ubuntu 16, 18, or 20');
    }

    const missing = [];

    if (!(await hasService('systemd'))) {
        missing.push('systemd');
    }

    if (!(await hasService(nginxProgramName))) {
        missing.push('nginx');
    }

    if (missing.length) {
        throw new Error(`Missing package(s): ${missing.join(', ')}`);
    }
}

async function systemStack(ctx, task) {
    try {
        await checkSystem(ctx);
    } catch (error) {
        ctx.ui.log(
            `System checks failed with message: '${error.message}'
Some features of Ghost-CLI may not work without additional configuration.
For local installs we recommend using \`ghost install local\` instead.`,
            'yellow'
        );

        const skip = await ctx.ui.confirm(chalk.blue('Continue anyway?'), false);
        if (skip) {
            task.skip('System stack check skipped');
            return;
        }

        throw new SystemError({
            message: `System stack checks failed with message: '${error.message}'`,
            task: taskTitle
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
