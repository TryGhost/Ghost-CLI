const chalk = require('chalk').default;
const {execa} = require('execa');
const semver = require('semver');

const {SystemError} = require('../../../errors');
const {MINIMUM_PNPM_VERSION} = require('../../../utils/pnpm');

const taskTitle = 'Checking pnpm installation';

const GHOST_VERSION_WITH_PNPM = '6.30.0';
// Ghost 6.62.0 is the first release to pin pnpm 12 in its `packageManager` field.
// pnpm older than MINIMUM_PNPM_VERSION installs that pin without linking pnpm 12's
// native binary, so the install later fails with a shell syntax error.
const GHOST_VERSION_WITH_PNPM_12 = '6.62.0';

async function checkPnpm() {
    try {
        const {stdout} = await execa('pnpm', ['--version'], {timeout: 5000});
        const version = stdout.trim();
        return {available: true, version};
    } catch {
        return {available: false};
    }
}

async function checkCorepack() {
    try {
        const {stdout} = await execa('corepack', ['--version'], {timeout: 5000});
        const version = stdout.trim();
        return {available: true, version};
    } catch {
        return {available: false};
    }
}

function assertCanInstallPinnedPnpm(ctx, pnpmVersion) {
    if (!semver.gte(ctx.version, GHOST_VERSION_WITH_PNPM_12)) {
        return;
    }

    const installed = semver.coerce(pnpmVersion);
    if (!installed || semver.gte(installed, MINIMUM_PNPM_VERSION)) {
        return;
    }

    throw new SystemError({
        message: `${chalk.red(`pnpm v${pnpmVersion} is too old to install the pnpm version Ghost v${ctx.version} requires.`)}`,
        help: `Ghost v${ctx.version} pins pnpm 12, which only pnpm v${MINIMUM_PNPM_VERSION} and later can install correctly.`,
        suggestion: 'npm install -g pnpm@latest',
        task: taskTitle
    });
}

async function pnpmCheck(ctx, task) {
    const pnpm = await checkPnpm();
    if (pnpm.available) {
        assertCanInstallPinnedPnpm(ctx, pnpm.version);
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
