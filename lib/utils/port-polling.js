'use strict';

const net = require('net');
const errors = require('../errors');

module.exports = function portPolling(options) {
    options = Object.assign({
        timeoutInMS: 2000,
        maxTries: 20,
        delayOnConnectInMS: 3 * 2000,
        logSuggestion: 'ghost log',
        socketTimeoutInMS: 1000 * 60
    }, options || {});

    if (!options.port) {
        return Promise.reject(new errors.CliError({
            message: 'Port is required.'
        }));
    }

    const connectToGhostSocket = (() => {
        return new Promise((resolve, reject) => {
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
                const err = new Error();
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
    });

    const startPolling = (() => {
        return new Promise((resolve, reject) => {
            let tries = 0;

            (function retry() {
                connectToGhostSocket()
                    .then(() => {
                        resolve();
                    })
                    .catch((err) => {
                        if (err.retry && tries < options.maxTries) {
                            tries = tries + 1;
                            setTimeout(retry, options.timeoutInMS);
                            return;
                        }

                        reject(new errors.GhostError({
                            message: 'Ghost did not start.',
                            suggestion: options.logSuggestion,
                            err: err
                        }));
                    });
            }());
        });
    });

    return startPolling();
};
