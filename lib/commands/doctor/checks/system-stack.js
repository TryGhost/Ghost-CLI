'use strict';
const chalk = require('chalk');
const execa = require('execa');

const errors = require('../../../errors');

function systemStack(ctx) {
    let promise;

    if (!ctx.system.platform.linux) {
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
            `System checks failed with message: '${error.message}'
Some features of Ghost-CLI may not work without additional configuration.
For local installs we recommend using \`ghost install local\` instead.`,
            'yellow'
        );

        return ctx.ui.allowPrompt ? ctx.ui.confirm(chalk.blue('Continue anyway?'), false) : Promise.resolve({yes: false});
    }).then(answer => answer.yes || Promise.reject(
        new errors.SystemError('System checks failed.')
    ));
}

module.exports = {
    title: 'Checking operating system compatibility',
    task: systemStack,
    enabled: (ctx) => !ctx.local,
    skip: (ctx) => ctx.argv && !ctx.argv.stack,
    category: ['install']
}
