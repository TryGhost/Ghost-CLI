'use strict';
const os = require('os');
const chalk = require('chalk');
const execa = require('execa');
const ListrError = require('listr/lib/listr-error');

const errors = require('../../../errors');

module.exports = [{
    title: 'System Stack',
    task: (context) => {
        let promise;

        if (os.platform() !== 'linux') {
            promise = Promise.reject(new errors.SystemError(chalk.yellow('Platform is not Linux')));
        } else {
            promise = execa.shell('lsb_release -a').then((result) => {
                if (!result.stdout || !result.stdout.match(/Ubuntu 16/)) {
                    return Promise.reject(new errors.SystemError(chalk.yellow('Linux version is not Ubuntu 16')));
                }

                return context.ui.listr([{
                    title: 'Systemd',
                    task: () => execa.shell('dpkg -l | grep systemd')
                        .catch(() => Promise.reject({missing: 'systemd'}))
                }, {
                    title: 'Nginx',
                    task: () => execa.shell('dpkg -l | grep nginx')
                        .catch(() => Promise.reject({missing: 'nginx'}))
                }], context, {concurrent: true, renderer: context.ui.verbose ? 'verbose' : 'silent', exitOnError: false})
            });
        }

        return promise.then(() => { return {yes: true}; }).catch((error) => {
            if (error instanceof ListrError) {
                error = new errors.SystemError(`Missing installed packages: ${error.errors.map(e => e.missing).join(', ')}`);
            }

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

            return context.ui.confirm(chalk.blue('Continue anyways?'), true);
        }).then(
            (answer) => answer.yes || Promise.reject(new errors.SystemError(
                `Setup was halted. Ghost is installed but not fully setup.${os.EOL}` +
                'Fix any errors shown and re-run `ghost setup`, or run `ghost setup --no-stack`.'
            ))
        );
    }
}];
