'use strict';
const execa = require('execa');
const {Observable} = require('rxjs');
const {ProcessError} = require('../errors');

/**
 * Runs a pnpm command. Can return an Observer which allows
 * listr to output the current status of pnpm
 */
module.exports = function pnpm(pnpmArgs, options) {
    options = options || {};

    const observe = options.observe || false;
    delete options.observe;

    pnpmArgs = pnpmArgs || [];

    const execaOpts = {...options, preferLocal: true, localDir: __dirname};
    const cp = execa('pnpm', pnpmArgs, execaOpts);

    if (!observe) {
        return cp.catch(error => Promise.reject(new ProcessError(error)));
    }

    return new Observable((observer) => {
        const onData = data => observer.next(data.replace(/\n$/, ''));

        cp.stdout.setEncoding('utf8');
        cp.stdout.on('data', onData);

        cp.then(() => {
            observer.complete();
        }).catch((error) => {
            observer.error(new ProcessError(error));
        });
    });
};
