'use strict';
const execa = require('execa');
const {Observable} = require('rxjs');
const {ProcessError} = require('../errors');

/**
 * Runs a yarn command. Can return an Observer which allows
 * listr to output the current status of yarn
 */
module.exports = function yarn(yarnArgs, options) {
    options = options || {};

    const observe = options.observe || false;
    delete options.observe;

    yarnArgs = yarnArgs || [];

    const execaOpts = Object.assign({}, options, {
        preferLocal: true,
        localDir: __dirname
    });

    const cp = execa('yarn', yarnArgs, execaOpts);

    if (!observe) {
        // execa augments the error object with
        // some other properties, so we just pass
        // the entire error object in as options to
        // the ProcessError
        return cp.catch(error => Promise.reject(new ProcessError(error)));
    }

    return new Observable((observer) => {
        cp.stdout.setEncoding('utf8');

        cp.stdout.on('data', (data) => {
            observer.next(data.replace(/\n$/, ''));
        });

        cp.then(() => {
            observer.complete();
        }).catch((error) => {
            // execa augments the error object with
            // some other properties, so we just pass
            // the entire error object in as options to
            // the ProcessError
            observer.error(new ProcessError(error));
        });
    });
};
