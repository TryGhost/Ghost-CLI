'use strict';
const chalk = require('chalk');
const execa = require('execa');
const which = require('which');
const {Observable} = require('rxjs');
const {ProcessError, SystemError} = require('../errors');

function runPnpm(pnpmArgs, options) {
    const hasPnpm = which.sync('pnpm', {nothrow: true});
    if (hasPnpm) {
        return execa('pnpm', pnpmArgs, options);
    }

    const hasCorepack = which.sync('corepack', {nothrow: true});
    if (hasCorepack) {
        return execa('corepack', ['pnpm'].concat(pnpmArgs), options);
    }

    return Promise.reject(new SystemError({
        message: 'pnpm is not installed and corepack is not available to provide it.',
        help: `Please install pnpm manually from ${chalk.underline.blue('https://pnpm.io/installation')} before continuing.`
    }));
}

/**
 * Runs a pnpm command. Can return an Observer which allows
 * listr to output the current status of pnpm
 */
module.exports = function pnpm(pnpmArgs, options) {
    options = options || {};

    const observe = options.observe || false;
    delete options.observe;

    const cp = runPnpm(pnpmArgs || [], options);

    if (!observe) {
        return cp.catch(error => Promise.reject(error instanceof SystemError ? error : new ProcessError(error)));
    }

    return new Observable((observer) => {
        const onData = data => observer.next(data.replace(/\n$/, ''));

        cp.stdout.setEncoding('utf8');
        cp.stdout.on('data', onData);

        cp.then(() => {
            observer.complete();
        }).catch((error) => {
            observer.error(error instanceof SystemError ? error : new ProcessError(error));
        });
    });
};
