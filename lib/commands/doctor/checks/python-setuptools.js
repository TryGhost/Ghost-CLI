const execa = require('execa');
const semver = require('semver');

const {SystemError} = require('../../../errors');

const taskTitle = 'Checking SQLite build dependencies';

async function checkPython3() {
    try {
        const {stdout} = await execa('python3', ['--version'], {timeout: 5000});
        const version = stdout.trim().replace('Python ', '');
        return {available: true, version};
    } catch (error) {
        return {available: false};
    }
}

async function checkSetuptools() {
    try {
        await execa('python3', ['-c', 'import setuptools'], {timeout: 5000});
        return true;
    } catch (error) {
        return false;
    }
}

async function pythonSetuptoolsCheck(ctx, task) {
    const python = await checkPython3();

    if (!python.available) {
        throw new SystemError({
            message: 'Python is required for SQLite3',
            task: taskTitle
        });
    }

    task.title = `${taskTitle} - found Python v${python.version}`;

    // Only check setuptools for Python 3.12+ since distutils was removed from the standard library
    const needsSetuptools = semver.gte(python.version, '3.12.0');

    if (needsSetuptools) {
        const hasSetuptools = await checkSetuptools();
        if (!hasSetuptools) {
            throw new SystemError({
                message: 'Python setuptools is required for SQLite3 when using Python 3.12+',
                task: taskTitle
            });
        }

        task.title = `${taskTitle} - found Python v${python.version} with setuptools`;
    } else {
        task.title = `${taskTitle} - found Python v${python.version}`;
    }
}

function pythonSetuptoolsIsRequired(ctx) {
    const nodeVersion = process.versions.node;
    const isNode22Plus = semver.gte(nodeVersion, '22.0.0');

    // SQLite3 provides binaries for node versions < 22
    if (!isNode22Plus) {
        return false;
    }

    // If already setup, then check if sqlite is being used
    if (ctx.instance.isSetup) {
        return ctx.instance.config.values.database.client === 'sqlite3';
    }

    // Otherwise, check if local or sqlite3 explicitly specified
    return ctx.local || ctx.argv.db === 'sqlite3';
}

module.exports = {
    title: taskTitle,
    task: pythonSetuptoolsCheck,
    enabled: pythonSetuptoolsIsRequired,
    category: ['install']
};
