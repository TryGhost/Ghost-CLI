'use strict';
const assign = require('lodash/assign');
const path = require('path');
const execa = require('execa');
const Observable = require('rxjs').Observable;

const errors = require('../errors');

module.exports = function yarn(yarnArgs, options) {
    let env = process.env;
    options = options || {};

    let observe = options.observe || false;
    delete options.observe;

    yarnArgs = yarnArgs || [];

    // NOTE: this hack is needed because of https://github.com/sindresorhus/execa/issues/72
    let binPath = `${path.resolve(__dirname, '../../node_modules/.bin')}:${process.env.PATH}`;
    options.env = assign({}, env, options.env || {}, {
        PATH: binPath
    });

    let cp = execa('yarn', yarnArgs, assign({}, options, {preferLocal: false}));

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

            // execa augments the error object with
            // some other properties, so we just pass
            // the entire error object in as options to
            // the ProcessError
            return Promise.reject(new errors.ProcessError(error));
        });
    });
};
