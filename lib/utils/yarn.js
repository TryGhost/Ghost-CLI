'use strict';
const assign = require('lodash/assign');
const execa = require('execa');
const Observable = require('rxjs').Observable;

module.exports = function yarn(yarnArgs, options) {
    let env = process.env;
    options = options || {};

    let observe = options.observe || false;
    delete options.observe;

    yarnArgs = yarnArgs || [];
    options.env = assign({}, env, options.env || {});

    let cp = execa('yarn', yarnArgs, options);

    if (!observe) {
        return cp;
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
    });
};
