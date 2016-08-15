var Promise = require('bluebird'),
    spawn   = require('child_process').spawn,
    path    = require('path'),
    _       =  require('lodash'),

    stream = require('./stream');

function runCli(command, options) {
    var argv = command.split(' ');

    options = options || {};
    options.env = (options.env) ? _.assign(options.env, process.env) : process.env;

    return new Promise(function runTheThing(resolve, reject) {
        var stdout = '',
            stderr = '',
            cp;

        function onError(errString) {
            stderr += errString;
        }

        function onOut(outString) {
            stdout += outString;
        }

        cp = spawn(path.resolve(__dirname, '../../bin/ghost'), argv, options);

        // TODO: figure out how to get stdin working

        cp.stdout.pipe(stream.getWritableStream(onOut, true));
        cp.stderr.pipe(stream.getWritableStream(onError, true));

        cp.on('error', function onSpawnError(error) {
            return reject(error);
        });

        cp.on('exit', function (code, signal) {
            // Return code & signal as well as stdio streams
            var result = {
                code: code,
                signal: signal,
                stdout: stdout,
                stderr: stderr
            };

            return (code !== 0 || stderr) ? reject(result) : resolve(result);
        });
    });
}

module.exports = runCli;
