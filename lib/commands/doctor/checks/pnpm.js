const chalk = require('chalk');
const execa = require('execa');
const semver = require('semver');

const {SystemError} = require('../../../errors');

const taskTitle = 'Checking pnpm installation';

const GHOST_VERSION_WITH_PNPM = '6.30.0';

async function checkPnpm() {
    try {
        const {stdout} = await execa('pnpm', ['--version'], {timeout: 5000});
        const version = stdout.trim();
        return {available: true, version};
    } catch (error) {
        return {available: false};
    }
}

async function checkCorepack() {
    try {
        const {stdout} = await execa('corepack', ['--version'], {timeout: 5000});
        const version = stdout.trim();
        return {available: true, version};
    } catch (error) {
        return {available: false};
    }
}

async function pnpmCheck(_, task) {
    const pnpm = await checkPnpm();
    if (pnpm.available) {
        task.title = `${taskTitle} - found pnpm v${pnpm.version}`;
        return;
    }

    const corepack = await checkCorepack();
    if (!corepack.available) {
        throw new SystemError({
            message: `${chalk.red('pnpm is not installed and corepack is not available to provide it.')}`,
            help: `Please install pnpm manually from ${chalk.underline.blue('https://pnpm.io/installation')} before continuing.`,
            task: taskTitle
        });
    }

    task.title = `${taskTitle} - found corepack v${corepack.version}`;
}

function enabled(ctx) {
    // only enabled if version if specified in context from install/update commands
    if (!ctx.version) {
        return false;
    }

    return semver.gte(ctx.version, GHOST_VERSION_WITH_PNPM);
}

module.exports = {
    title: taskTitle,
    task: pnpmCheck,
    enabled,
    category: ['install', 'update']
};
