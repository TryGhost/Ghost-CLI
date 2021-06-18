const chalk = require('chalk');
const {SystemError} = require('../../../errors');

const taskTitle = 'Checking binary dependencies';

function binaryDeps(ctx, task) {
    if (!ctx.instance) {
        return task.skip('Instance not set');
    }

    if (process.versions.node !== ctx.instance.nodeVersion) {
        const currentVersion = ctx.instance.version;

        throw new SystemError({
            message: 'The installed node version has changed since Ghost was installed.',
            help: `Run ${chalk.green(`ghost update ${currentVersion} --force`)} to re-install binary dependencies.`,
            task: taskTitle
        });
    }
}

module.exports = {
    title: taskTitle,
    task: binaryDeps,
    category: ['start']
};
