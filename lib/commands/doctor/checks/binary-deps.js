// @ts-check

const path = require('path');
const {SystemError, ProcessError} = require('../../../errors');
const {shouldUseGhostUser} = require('../../../utils/use-ghost-user');

const taskTitle = 'Checking binary dependencies';

async function binaryDeps(ctx, task) {
    if (!ctx.instance) {
        return task.skip('Instance not set');
    }

    const {instance} = ctx;
    const nodeExecPath = instance.nodeBinary;

    if (nodeExecPath !== process.argv[0]) {
        throw new SystemError({
            message: 'You might have multiple versions of node installed @todo: copy',
            help: '@todo copy',
            task: taskTitle
        });
    }

    const checks = [];

    if (instance.config.get('database.client') === 'sqlite3') {
        checks.push('sqlite3');
    }

    const imageOptimizationConfig = instance.config.get('imageOptimization', {});

    // Only check sharp if imageOptimization is not specifically configured, or if
    // resizing is explicitly enabled
    if (!('resize' in imageOptimizationConfig) || imageOptimizationConfig.resize) {
        checks.push('sharp');
    }

    const preCheckPath = path.resolve(__dirname, '../../../../precheck.js');

    let preCheckRun;
    const command = `${nodeExecPath} ${preCheckPath} ${checks.join(',')}`;
    const env = {
        // Set the NODE_PATH to the location of this instance's node_modules folder
        // That way the script will try to load the modules from the instance
        // rather than the CLI, which doesn't use the binary dependencies
        NODE_PATH: path.resolve(instance.dir, 'current/node_modules')
    };

    if (shouldUseGhostUser(path.join(instance.dir, 'content'))) {
        preCheckRun = ctx.ui.sudo(command, {sudoArgs: '-E -u ghost', env});
    } else {
        const execa = require('execa');
        preCheckRun = execa.shell(command, {env});
    }

    /**@type {{[s: string]: {success: boolean; error?: string}}}*/
    let results;

    try {
        const {stdout} = await preCheckRun;
        results = JSON.parse(stdout);
    } catch (error) {
        throw new ProcessError({
            cmd: command,
            err: error,
            log: true,
            message: `Failed running precheck. Result:\nError: ${error.message}`
        });
    }

    let hasFailed = false;
    let failIndex = 1;

    for (const check of checks) {
        const result = results[check];
        if (!result.success) {
            hasFailed = true;
            ctx.ui.log(`${failIndex}) ${check} failed to load`, 'red');
            ctx.ui.log(result.error.replace('\\n', '\n'), 'yellow');

            failIndex += 1;
        }
    }

    if (hasFailed) {
        throw new SystemError({
            message: 'Some binary checks failed'
        });
    }
}

module.exports = {
    title: taskTitle,
    task: binaryDeps,
    category: ['start']
};
