'use strict';
const os = require('os');
const chalk = require('chalk');
const execa = require('execa');

const errors = require('../../../errors');

module.exports = [{
    title: 'System Stack',
    task: (context) => {
        let promise;

        if (os.platform() !== 'linux') {
            context.linux = false;
            promise = Promise.reject(new errors.SystemError(chalk.yellow('Platform is not Linux')));
        } else {
            context.linux = true;

            promise = execa.shell('lsb_release -a').then((result) => {
                if (!result.stdout || !result.stdout.match(/Ubuntu 16/)) {
                    context.ubuntu = false;
                    return Promise.reject(new errors.SystemError(chalk.yellow('Linux version is not Ubuntu 16')));
                }

                context.ubuntu = true;

                return context.ui.listr([{
                    title: 'Systemd',
                    task: (ctx) => execa.shell('dpkg -l | grep systemd').then(() => {
                        ctx.systemd = true;
                    })
                }, {
                    title: 'Nginx',
                    task: (ctx) => execa.shell('dpkg -l | grep nginx').then(() => {
                        ctx.nginx = true;
                    })
                }], context, {concurrent: true, renderer: context.ui.verbose ? 'verbose' : 'silent', exitOnError: false})
            })
        }

        return promise.then(() => { return {continue: true}; }).catch((error) => {
            // If the error caught is not a SystemError, something went wrong with execa,
            // so throw a ProcessError instead
            if (!(error instanceof errors.SystemError)) {
                return Promise.reject(new errors.ProcessError(error));
            }

            // This is a check so that when running as part of `ghost setup`, we can do things more cleanly
            // As part of `ghost doctor`, none of the below should run
            if (!context.setup) {
                return Promise.reject(error);
            }

            context.ui.log(
                `System Stack checks failed with message: '${error.message}'.${os.EOL}` +
                'Some features of Ghost-CLI may not work without additional configuration.',
                'yellow'
            );

            return context.ui.prompt({
                type: 'confirm',
                name: 'continue',
                message: chalk.blue('Continue anyways?'),
                default: true
            });
        }).then(
            (answers) => answers.continue || Promise.reject(new errors.SystemError(
                `Setup was halted. Ghost is installed but not fully setup.${os.EOL}` +
                'Fix any errors shown and re-run `ghost setup`, or run `ghost setup --no-stack`.'
            ))
        );
    }
}];
