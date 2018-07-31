'use strict';

module.exports = function ui(ctx) {
    const chalk = require('chalk');
    const logSymbols = require('log-symbols');
    const each = require('lodash/each');
    const errors = require('../../errors');
    const getData = require('./data');
    let gscanReport;
    let demoPost;

    return getData({
        dir: ctx.instance.dir,
        database: ctx.instance.config.get('database'),
        version: `versions/${ctx.version}`
    }).then((response) => {
        gscanReport = response.gscanReport;
        demoPost = response.demoPost;

        ctx.ui.log(chalk.bold.underline.white(`\n\nChecking theme compatibility for Ghost ${ctx.version}\n`));
        if (!gscanReport.results.error.all.length && !gscanReport.results.warning.all.length) {
            ctx.ui.log(`${logSymbols.success} Your theme is compatible.\n`);

            if (demoPost && demoPost.uuid) {
                const demoLink = `${ctx.instance.config.get('url')}p/${demoPost.uuid}/`;
                ctx.ui.log(`Visit the demo post at ${chalk.cyan(demoLink)} to see how your theme looks like in Ghost 2.0`);
            }

            ctx.ui.log(`You can also check theme compatibility at ${chalk.cyan('https://gscan.ghost.org')}\n`);
        } else {
            let message = '';

            if (gscanReport.results.warning.all.length && !gscanReport.results.error.all.length) {
                message += `${chalk.yellow('⚠')} Your theme has `;

                let text = 'warning';

                if (gscanReport.results.warning.all.length > 1) {
                    text = 'warnings';
                }

                message += chalk.bold.yellow(`${gscanReport.results.warning.all.length} ${text}`);
            } else if (!gscanReport.results.warning.all.length && gscanReport.results.error.all.length) {
                message += `${chalk.red('⚠')} Your theme has `;

                let text = 'error';

                if (gscanReport.results.error.all.length > 1) {
                    text = 'errors';
                }

                message += chalk.bold.red(`${gscanReport.results.error.all.length} ${text}`);
            } else if (gscanReport.results.warning.all.length && gscanReport.results.error.all.length) {
                message += `${chalk.red('⚠')} Your theme has `;

                let text1 = 'error';
                let text2 = 'warning';

                if (gscanReport.results.error.all.length > 1) {
                    text1 = 'errors';
                }

                if (gscanReport.results.warning.all.length > 1) {
                    text2 = 'warnings';
                }

                message += chalk.bold.red(`${gscanReport.results.error.all.length} ${text1}`);
                message += ' and ';
                message += chalk.bold.yellow(`${gscanReport.results.warning.all.length} ${text2}`);
            }

            message += '\n';
            ctx.ui.log(message);

            return ctx.ui.confirm('View error and warning details?', null, {prefix: chalk.cyan('?')});
        }
    }).then((answer) => {
        if (answer) {
            const spaces = '    ';

            if (gscanReport.results.error.all.length) {
                ctx.ui.log(chalk.bold.red('\nErrors'));

                each(gscanReport.results.error.byFiles, (errors, fileName) => {
                    if (!errors.length) {
                        return;
                    }

                    let message = chalk.bold.white(`${spaces}File: `);
                    message += chalk.white(`${fileName}`);
                    message += '\n';

                    errors.forEach((error, index) => {
                        if (error.fatal) {
                            message += `${spaces}- ${chalk.bold.red('Fatal error:')} ${error.rule.replace(/(<([^>]+)>)/ig, '')}`;
                        } else {
                            message += `${spaces}- ${error.rule.replace(/(<([^>]+)>)/ig, '')}`;
                        }

                        if (index < (errors.length - 1)) {
                            message += '\n';
                        }
                    });

                    message += '\n';
                    ctx.ui.log(message);
                });
            }

            if (gscanReport.results.warning.all.length) {
                ctx.ui.log(chalk.bold.yellow('\nWarnings'));

                each(gscanReport.results.warning.byFiles, (warnings, fileName) => {
                    if (!warnings.length) {
                        return;
                    }

                    let message = chalk.bold.white(`${spaces}File: `);
                    message += chalk.white(`${fileName}`);
                    message += '\n';

                    warnings.forEach((warning, index) => {
                        message += `${spaces}- ${warning.rule.replace(/(<([^>]+)>)/ig, '')}`;

                        if (index < (warnings.length - 1)) {
                            message += '\n';
                        }
                    });

                    message += '\n';
                    ctx.ui.log(message);
                });
            }

            if (demoPost && demoPost.uuid) {
                const demoLink = `${ctx.instance.config.get('url')}p/${demoPost.uuid}/`;
                ctx.ui.log(`Visit the demo post at ${chalk.cyan(demoLink)} to see how your theme looks like in Ghost 2.0`);
            }

            ctx.ui.log(`You can also check theme compatibility at ${chalk.cyan('https://gscan.ghost.org')}\n`);
        }

        if (gscanReport.results.hasFatalErrors) {
            return Promise.reject(new errors.CliError({
                message: 'Migration failed. Your theme has fatal errors.\n  For additional theme help visit https://themes.ghost.org/docs/changelog',
                logMessageOnly: true
            }));
        }

        return ctx.ui.confirm(`Are you sure you want to proceed with migrating to Ghost ${ctx.version}?`, null, {prefix: chalk.cyan('?')})
            .then((answer) => {
                if (!answer) {
                    return Promise.reject(new errors.CliError({
                        message: `Update aborted. Your blog is still on ${ctx.activeVersion}.`,
                        logMessageOnly: true
                    }));
                }
            });
    });
};
