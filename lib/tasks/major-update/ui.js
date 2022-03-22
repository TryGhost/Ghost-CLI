'use strict';
const chalk = require('chalk');
const each = require('lodash/each');

const TAGS_REGEX = /(<([^>]+)>)/ig;
const SPACES = '    ';

function showDetails(ui, results, error) {
    ui.log(chalk.bold.red(`\n${error ? 'Errors' : 'Warnings'}`));

    each(results, (list, fileName) => {
        /* istanbul ignore if */
        if (!list.length) {
            return;
        }

        const details = list.map((result) => {
            if (error && result.fatal) {
                return `${SPACES}- ${chalk.bold.red('Fatal error:')} ${result.rule.replace(TAGS_REGEX, '')}`;
            }

            return `${SPACES}- ${result.rule.replace(TAGS_REGEX, '')}`;
        }).join('\n');

        ui.log(`${chalk.bold.white(`${SPACES}File:`)} ${chalk.white(fileName)}\n${details}\n`);
    });
}

module.exports = async function ui(ctx) {
    const logSymbols = require('log-symbols');
    const semver = require('semver');
    const {CliError} = require('../../errors');
    const getData = require('./data');

    const {gscanReport, demoPost = {}} = await getData({
        dir: ctx.instance.dir,
        database: ctx.instance.config.get('database'),
        versionFolder: `versions/${ctx.version}`,
        version: ctx.version
    });

    const {results} = gscanReport;

    ctx.ui.log(chalk.bold.underline.white(`\n\nChecking theme compatibility for Ghost ${ctx.version}\n`));
    if (!results.error.all.length && !results.warning.all.length) {
        ctx.ui.log(`${logSymbols.success} Your theme is compatible.\n`);

        /* istanbul ignore else */
        if (demoPost.uuid) {
            const demoLink = `${ctx.instance.config.get('url').replace(/\/$/,'')}/p/${demoPost.uuid}/`;
            ctx.ui.log(`Visit the demo post at ${chalk.cyan(demoLink)} to view your theme in Ghost v${semver.major(ctx.version)}`);
        }

        ctx.ui.log(`You can also check theme compatibility at ${chalk.cyan('https://gscan.ghost.org')}\n`);
        ctx.ui.log(`Please review the full list of breaking changes at ${chalk.cyan('https://ghost.org/docs/changes/')}\n`);
    } else {
        let message = '';

        const errors = results.error.all;
        const warnings = results.warning.all;

        const hasErrors = errors.length;
        const hasWarnings = warnings.length;
        const errorText = chalk.bold.red(`${errors.length} ${errors.length === 1 ? 'error' : 'errors'}`);
        const warningText = chalk.bold.yellow(`${warnings.length} ${warnings.length === 1 ? 'warning' : 'warnings'}`);

        /* istanbul ignore else */
        if (hasWarnings && !hasErrors) {
            message = `${chalk.yellow('⚠')} Your theme has ${warningText}`;
        } else if (hasErrors && !hasWarnings) {
            message = `${chalk.red('⚠')} Your theme has ${errorText}`;
        } else if (hasWarnings && hasErrors) {
            message = `${chalk.red('⚠')} Your theme has ${errorText} and ${warningText}`;
        }

        ctx.ui.log(`${message}\n`);

        const answer = await ctx.ui.confirm('View error and warning details?', null, {prefix: chalk.cyan('?')});

        // istanbul ignore else
        if (answer) {
            if (results.error.all.length) {
                showDetails(ctx.ui, results.error.byFiles, true);
            }

            if (results.warning.all.length) {
                showDetails(ctx.ui, results.warning.byFiles, false);
            }

            if (demoPost.uuid) {
                const demoLink = `${ctx.instance.config.get('url').replace(/\/$/,'')}/p/${demoPost.uuid}/`;
                ctx.ui.log(`Visit the demo post at ${chalk.cyan(demoLink)} to see how your theme looks like in Ghost 2.0`);
            }

            ctx.ui.log(`You can also check theme compatibility at ${chalk.cyan('https://gscan.ghost.org')}\n`);
            ctx.ui.log(`Please review the full list of breaking changes at ${chalk.cyan('https://ghost.org/docs/changes/')}\n`);
        }
    }

    if (results.hasFatalErrors) {
        throw new CliError({
            message: 'Migration failed. Your theme has fatal errors.\n  For additional theme help visit https://ghost.org/docs/themes/',
            logMessageOnly: true
        });
    }

    const autoUpgradeDefault = !results.error.all.length;
    const answer = await ctx.ui.confirm(`Are you sure you want to proceed with migrating to Ghost ${ctx.version}?`, autoUpgradeDefault, {prefix: chalk.cyan('?')});
    if (!answer) {
        throw new CliError({
            message: `Update aborted. Your blog is still on ${ctx.activeVersion}.`,
            logMessageOnly: true
        });
    }
};
