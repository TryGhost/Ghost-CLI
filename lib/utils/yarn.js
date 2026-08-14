'use strict';
const {execa} = require('execa');
const {PassThrough} = require('stream');
const {ProcessError} = require('../errors');

/**
 * Runs a yarn command. Can return a readable stream which allows
 * listr to output the current status of yarn
 */
module.exports = function yarn(yarnArgs, options) {
    options = options || {};

    const observe = options.observe || false;
    delete options.observe;

    const verbose = options.verbose || false;
    delete options.verbose;

    yarnArgs = yarnArgs || [];

    if (verbose) {
        yarnArgs.push('--verbose');
    }

    const execaOpts = {...options, preferLocal: true, localDir: __dirname};
    const cp = execa('yarn', yarnArgs, execaOpts);

    if (!observe) {
        // execa augments the error object with
        // some other properties, so we just pass
        // the entire error object in as options to
        // the ProcessError
        return cp.catch(error => Promise.reject(new ProcessError(error)));
    }

    const output = new PassThrough({encoding: 'utf8'});

    // `end: false` so the output only ends once the process itself is done
    cp.stdout.pipe(output, {end: false});

    if (verbose) {
        cp.stderr.pipe(output, {end: false});
    }

    // execa augments the error object with
    // some other properties, so we just pass
    // the entire error object in as options to
    // the ProcessError
    cp.then(() => output.end(), error => output.destroy(new ProcessError(error)));

    return output;
};
