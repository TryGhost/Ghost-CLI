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

function isCorepackSignatureError(error) {
    const output = [
        error.message,
        error.stderr,
        error.stdout,
        error.shortMessage,
        error.originalMessage
    ].filter(Boolean).join('\n');

    return output.includes('Cannot find matching keyid') && output.includes('corepack');
}

function isReadonlyStoreError(error) {
    const output = [error.stderr, error.stdout].filter(Boolean).join('\n');
    return output.includes('attempt to write a readonly database') || output.includes('SQLITE_READONLY');
}

function toPnpmError(error) {
    if (error instanceof SystemError) {
        return error;
    }

    if (isCorepackSignatureError(error)) {
        return new SystemError({
            message: 'Corepack could not verify pnpm because its package-signing keys are out of date.',
            help: 'Update Corepack, enable it, and activate pnpm before running the Ghost command again.',
            suggestion: 'npm install -g corepack@latest && corepack enable'
        });
    }

    if (isReadonlyStoreError(error)) {
        return new SystemError({
            message: 'pnpm could not write to its package store because the store database is read-only.',
            help: 'Ensure the Ghost install directory is on local disk (not a network mount) and owned by the current user, then try again.'
        });
    }

    return new ProcessError(error);
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
        return cp.catch(error => Promise.reject(toPnpmError(error)));
    }

    return new Observable((observer) => {
        const onData = data => observer.next(data.replace(/\n$/, ''));

        cp.stdout.setEncoding('utf8');
        cp.stdout.on('data', onData);

        cp.then(() => {
            observer.complete();
        }).catch((error) => {
            observer.error(toPnpmError(error));
        });
    });
};
