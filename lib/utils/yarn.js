'use strict';
const assign = require('lodash/assign');
const execa = require('execa');
const Observable = require('rxjs').Observable;

const errors = require('../errors');

/**
 * Runs a yarn command. Can return an Observer which allows
 * listr to output the current status of yarn
 */
module.exports = function yarn(yarnArgs, options) {
    options = options || {};

    let observe = options.observe || false;
    delete options.observe;

    yarnArgs = yarnArgs || [];

    let execaOpts = assign({}, options, {
        preferLocal: true,
        localDir: __dirname
    });

    let cp = execa('yarn', yarnArgs, execaOpts);

    if (!observe) {
        return cp.catch((error) => {
            // execa augments the error object with
            // some other properties, so we just pass
            // the entire error object in as options to
            // the ProcessError
            return Promise.reject(new errors.ProcessError(error));
        });
    }

    return new Observable((observer) => {
        cp.stdout.setEncoding('utf8');

        cp.stdout.on('data', (data) => {
            observer.next(data);
        });

        cp.then(() => {
            observer.complete();
        }).catch((error) => {
            observer.error(error);
        });
    }).catch((error) => {
        // execa augments the error object with
        // some other properties, so we just pass
        // the entire error object in as options to
        // the ProcessError
        return Promise.reject(new errors.ProcessError(error));
    });
};
