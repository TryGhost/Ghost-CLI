const util = require('util');
const errors = require('../errors');

const getNodeVersion = (message) => {
    if (!message.debug || !message.debug.versions) {
        return null;
    }

    return message.debug.versions.node || null;
};

/**
 * @TODO: in theory it could happen that other clients connect, but tbh even with the port polling it was possible: you
 *        could just start a server on the Ghost port
 */
const useNetServer = (ui, options) => new Promise((resolve, reject) => {
    const net = require('net');
    const {useV4Boot} = options;

    let waitTimeout = null;
    let ghostSocket = null;
    let started = false;
    let nodeCheck = false;

    const server = net.createServer((socket) => {
        ghostSocket = socket;

        socket.on('data', (data) => {
            let message;

            try {
                message = JSON.parse(data);
            } catch (err) {
                message = {started: false, ready: false, error: err};
            }

            const nodeVersion = getNodeVersion(message);
            if (!nodeCheck && nodeVersion && nodeVersion !== process.versions.node) {
                nodeCheck = true;
                ui.log(
                    `Warning: Ghost is running with node v${nodeVersion}.\n` +
                    `Your current node version is v${process.versions.node}.`,
                    'yellow'
                );
            }

            ui.logVerbose(`Received message from Ghost: ${util.inspect(message)}`, 'green');

            if (useV4Boot && message.started) {
                started = true;
                socket.destroy();
                ghostSocket = null;
                return;
            }

            /* istanbul ignore else */
            if (waitTimeout) {
                clearTimeout(waitTimeout);
            }

            socket.destroy();
            ghostSocket = null;

            server.close(() => {
                if ((!useV4Boot && message.started) || (useV4Boot && message.ready)) {
                    resolve();
                } else {
                    let {message: errMsg} = message.error;
                    if (useV4Boot && started) {
                        errMsg = `Ghost was able to start, but errored during boot with: ${errMsg}`;
                    }

                    reject(new errors.GhostError({
                        message: errMsg,
                        help: message.error.help,
                        suggestion: options.logSuggestion
                    }));
                }
            });
        });
    });

    waitTimeout = setTimeout(() => {
        if (ghostSocket) {
            ghostSocket.destroy();
        }

        ghostSocket = null;

        server.close(() => {
            reject(new errors.GhostError({
                message: 'Could not communicate with Ghost',
                suggestion: options.logSuggestion
            }));
        });
    }, options.netServerTimeoutInMS);

    server.listen({host: options.socketAddress.host, port: options.socketAddress.port});
});

const usePortPolling = (_, options) => {
    const net = require('net');

    if (!options.port) {
        return Promise.reject(new errors.CliError({
            message: 'Port is required.'
        }));
    }

    const connectToGhostSocket = () => new Promise((resolve, reject) => {
        // if host is specified and is *not* 0.0.0.0 (listen on all ips), use the custom host
        const host = options.host && options.host !== '0.0.0.0' ? options.host : 'localhost';
        const ghostSocket = net.connect(options.port, host);
        let delayOnConnectTimeout;

        // inactivity timeout
        ghostSocket.setTimeout(options.socketTimeoutInMS);
        ghostSocket.on('timeout', (() => {
            if (delayOnConnectTimeout) {
                clearTimeout(delayOnConnectTimeout);
            }

            ghostSocket.destroy();

            // force retry
            const err = new Error('Socket timed out.');
            err.retry = true;
            reject(err);
        }));

        ghostSocket.on('connect', (() => {
            if (options.delayOnConnectInMS) {
                let ghostDied = false;

                // CASE: client closes socket
                ghostSocket.on('close', (() => {
                    ghostDied = true;
                }));

                delayOnConnectTimeout = setTimeout(() => {
                    ghostSocket.destroy();

                    if (ghostDied) {
                        reject(new Error('Ghost died.'));
                    } else {
                        resolve();
                    }
                }, options.delayOnConnectInMS);

                return;
            }

            ghostSocket.destroy();
            resolve();
        }));

        ghostSocket.on('error', ((err) => {
            ghostSocket.destroy();

            err.retry = true;
            reject(err);
        }));
    });

    const startPolling = (() => new Promise((resolve, reject) => {
        let tries = 0;

        (function retry() {
            connectToGhostSocket()
                .then(() => {
                    resolve();
                })
                .catch((err) => {
                    if (err.retry && tries < options.maxTries) {
                        tries = tries + 1;
                        setTimeout(retry, options.retryTimeoutInMS);
                        return;
                    }

                    /* istanbul ignore next */
                    if (err instanceof errors.CliError) {
                        return reject(err);
                    }

                    reject(new errors.GhostError({
                        message: 'Ghost did not start.',
                        suggestion: options.logSuggestion,
                        err: err
                    }));
                });
        }());
    }));

    return startPolling();
};

module.exports = function portPolling(ui, options) {
    options = Object.assign({
        retryTimeoutInMS: 2000,
        maxTries: 20,
        delayOnConnectInMS: 3 * 2000,
        logSuggestion: 'ghost log',
        socketTimeoutInMS: 1000 * 60,
        useNetServer: false,
        useV4Boot: false,
        netServerTimeoutInMS: 5 * 60 * 1000,
        socketAddress: {
            port: 1212,
            host: 'localhost'
        }
    }, options || {});

    if (options.useNetServer) {
        return useNetServer(ui, options);
    }

    return usePortPolling(ui, options);
};
