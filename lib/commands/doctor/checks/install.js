'use strict';
const fs = require('fs');
const os = require('os');
const eol = require('os').EOL;
const path = require('path');
const Mode = require('stat-mode');
const chalk = require('chalk');
const execa = require('execa');
const semver = require('semver');
const constants = require('constants');
const isRoot = require('path-is-root');

const errors = require('../../../errors');
const cliPackage = require('../../../../package');

function checkDirectoryAndAbove(dir) {
    if (isRoot(dir)) {
        return;
    }

    let stats = fs.lstatSync(dir);
    let mode = new Mode(stats);

    if (!mode.others.read) {
        throw new errors.SystemError(
            `The path ${dir} is not readable by other users on the system.${eol}` +
            'This can cause issues with the CLI, please either make this directory ' +
            'readable by others or install in another location.'
        );
    }

    return checkDirectoryAndAbove(path.join(dir, '../'));
}

module.exports = [{
    title: 'Checking system Node.js version',
    task: () => {
        if (process.env.GHOST_NODE_VERSION_CHECK !== 'false' &&
            !semver.satisfies(process.versions.node, cliPackage.engines.node)) {
            return Promise.reject(new errors.SystemError(
                `${chalk.red('The version of Node.js you are using is not supported.')}${eol}` +
                `${chalk.gray('Supported: ')}${cliPackage.engines.node}${eol}` +
                `${chalk.gray('Installed: ')}${process.versions.node}${eol}` +
                `See ${chalk.underline.blue('https://docs.ghost.org/docs/supported-node-versions')} ` +
                'for more information'
            ));
        }
    }
}, {
    title: 'Checking current folder permissions',
    task: (ctx) => {
        try {
            fs.accessSync(process.cwd(), constants.R_OK | constants.W_OK);
        } catch (e) {
            return Promise.reject(new errors.SystemError(
                `The current directory is not writable.${eol}` +
                'Please fix your directory permissions.'
            ));
        }

        if (ctx.local || os.platform() !== 'linux') {
            return;
        }

        checkDirectoryAndAbove(process.cwd());
    }
}, {
    title: 'Checking operating system',
    skip: (ctx) => ctx.local || (ctx.argv && !ctx.argv.stack),
    task: (ctx) => {
        let promise;

        if (os.platform() !== 'linux') {
            promise = Promise.reject({message: 'Operating system is not Linux'});
        } else {
            promise = execa.shell('lsb_release -a').catch(
                () => Promise.reject({message: 'Linux version is not Ubuntu 16'})
            ).then((result) => {
                if (!result.stdout || !result.stdout.match(/Ubuntu 16/)) {
                    return Promise.reject({message: 'Linux version is not Ubuntu 16'});
                }

                return ctx.ui.listr([{
                    title: 'Checking systemd is installed',
                    task: () => execa.shell('dpkg -l | grep systemd')
                        .catch(() => Promise.reject({missing: 'systemd'}))
                }, {
                    title: 'Checking nginx is installed',
                    task: () => execa.shell('dpkg -l | grep nginx')
                        .catch(() => Promise.reject({missing: 'nginx'}))
                }], ctx, {
                    concurrent: true,
                    exitOnError: false,
                    renderer: ctx.ui.verbose ? 'verbose' : 'silent'
                }).catch(error => Promise.reject({
                    message: `Missing package(s): ${error.errors.map(e => e.missing).join(', ')}`
                }))
            });
        }

        return promise.then(() => { return {yes: true}; }).catch((error) => {
            ctx.ui.log(
                `System checks failed with message: '${error.message}'${eol}` +
                `Some features of Ghost-CLI may not work without additional configuration.${eol}` +
                'For local installs we recommend using `ghost install local` instead.',
                'yellow'
            );

            return ctx.ui.confirm(chalk.blue('Continue anyway?'), false);
        }).then(answer => answer.yes || Promise.reject(
            new errors.SystemError('System checks failed.')
        ));
    }
}, {
    title: 'Checking MySQL is installed',
    skip: (ctx) => ctx.local || (ctx.argv && ctx.argv.db === 'sqlite3'),
    task: (ctx) => {
        // On ubuntu, mysqld is in `/usr/sbin` but it's not automatically in the PATH of non-root users
        // So, we modify the path env var to make things work
        let options = os.platform() === 'linux' ? {env: {PATH: `/usr/sbin:${process.env.PATH}`}} : {};

        // Technically this doesn't work on windows, but there's
        // not an easy way to do that anyways so ¯\_(ツ)_/¯
        return execa.shell('which mysqld', options).catch(() => {
            ctx.ui.log(
                chalk.yellow(`Local MySQL install not found. You can ignore this if you are using a remote MySQL host.${eol}`) +
                chalk.yellow(`Alternatively you could:${eol}`) +
                `${chalk.blue('a)')} install MySQL locally${eol}` +
                `${chalk.blue('b)')} run ${chalk.cyan('`ghost install --db=sqlite3`')} to use sqlite ${eol}` +
                `${chalk.blue('c)')} run ${chalk.cyan('`ghost install local`')} to get a development install using sqlite3.`
            );

            return ctx.ui.confirm(chalk.blue('Continue anyway?'), false)
                .then(answer => answer.yes || Promise.reject(
                    new errors.SystemError('MySQL check failed.')
                ));
        });
    }
}];
