'use strict';
const execa = require('execa');
const chalk = require('chalk');

const errors = require('../../../errors');

const taskTitle = 'Checking for a MySQL installation';

function mysqlCheck(ctx, task) {
    // On ubuntu, mysqld is in `/usr/sbin` but it's not automatically in the PATH of non-root users
    // So, we modify the path env var to make things work
    const options = ctx.system.platform.linux ? {env: {PATH: `/usr/sbin:${process.env.PATH}`}} : {};

    // Technically this doesn't work on windows, but there's
    // not an easy way to do that anyways so ¯\_(ツ)_/¯
    return execa.shell('which mysqld', options).catch(() => {
        ctx.ui.log(`${chalk.yellow(`Local MySQL install not found. You can ignore this if you are using a remote MySQL host.
Alternatively you could:`)}
${chalk.blue('a)')} install MySQL locally
${chalk.blue('b)')} run ${chalk.cyan('`ghost install --db=sqlite3`')} to use sqlite
${chalk.blue('c)')} run ${chalk.cyan('`ghost install local`')} to get a development install using sqlite3.`);

        return ctx.ui.confirm(chalk.blue('Continue anyway?'), false).then((confirmed) => {
            if (confirmed) {
                task.skip('MySQL check skipped');
                return Promise.resolve();
            }

            return Promise.reject(new errors.SystemError({
                message: 'MySQL check failed.',
                task: taskTitle
            }));
        });
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
