const chalk = require('chalk');
const sysinfo = require('systeminformation');

const {SystemError} = require('../../../errors');

const taskTitle = 'Checking for a MySQL installation';

async function mysqlIsRunning() {
    try {
        const services = await sysinfo.services('mysql');
        return services.some(s => s.name === 'mysql' && s.running);
    } catch (error) {
        return false;
    }
}

async function mysqlCheck(ctx, task) {
    if (await mysqlIsRunning()) {
        // mysql service found that is also running, so return
        return;
    }

    ctx.ui.log(`${chalk.yellow(`Local MySQL install was not found or is stopped. You can ignore this if you are using a remote MySQL host.
Alternatively you could:`)}
${chalk.blue('a)')} install/start MySQL locally
${chalk.blue('b)')} run ${chalk.cyan('`ghost install --db=sqlite3`')} to use sqlite
${chalk.blue('c)')} run ${chalk.cyan('`ghost install local`')} to get a development install using sqlite3.`);

    const confirm = await ctx.ui.confirm(chalk.blue('Continue anyway?'), false);
    if (confirm) {
        task.skip('MySQL check skipped');
        return;
    }

    throw new SystemError({
        message: 'MySQL check failed.',
        task: taskTitle
    });
}

function mysqlIsEnabled(ctx) {
    // Case 1: instance is already set, which means this check
    // is being run post-install. In this case, check the config for sqlite3
    // and an external mysql db. If either are found, check is disabled
    if (ctx.instance) {
        // instance is set, this check is being run post-install
        return ctx.instance.config.get('database.client') !== 'sqlite3' &&
            ['localhost', '127.0.0.1'].includes(ctx.instance.config.get('database.connection.host'));
    }

    // Case 2: Disable this check if
    // a) local install OR
    // b) --db sqlite3 is passed OR
    // c) --dbhost is passed and IS NOT 'localhost' or '127.0.0.1'
    return !ctx.local && ctx.argv.db !== 'sqlite3' &&
        (!ctx.argv.dbhost || ['localhost', '127.0.0.1'].includes(ctx.argv.dbhost));
}

module.exports = {
    title: taskTitle,
    task: mysqlCheck,
    // Disable this check if:
    // a) local install OR
    // b) --db sqlite3 is passed OR
    // c) --dbhost is passed and IS NOT 'localhost' or '127.0.0.1'
    enabled: mysqlIsEnabled,
    category: ['install']
};
