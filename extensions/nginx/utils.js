const isIP = require('validator/lib/isIP');

const {errors} = require('../../lib');
const {ProcessError, CliError} = errors;

// Used when resolv.conf doesn't list any usable nameservers
const fallbackResolvers = ['1.1.1.1', '8.8.8.8'];

function errorWrapper(fn) {
    return async (...args) => {
        try {
            await fn(...args);
        } catch (error) {
            if (error instanceof CliError) {
                throw error;
            }

            throw new ProcessError(error);
        }
    };
}

/**
 * Pulls the nameservers out of a resolv.conf file and formats them for use in an
 * nginx `resolver` directive. Nginx OSS can't read resolv.conf itself, so the
 * addresses have to be baked into the generated config.
 *
 * @param {string} contents Contents of /etc/resolv.conf
 * @returns {string} Space separated list of resolver addresses
 */
function parseResolvers(contents) {
    const nameservers = (contents || '').split('\n')
        .map(line => line.trim().match(/^nameserver\s+(\S+)/))
        .filter(Boolean)
        .map(([, address]) => address)
        .filter(address => isIP(address))
        // nginx expects IPv6 addresses to be wrapped in square brackets
        .map(address => (isIP(address, 6) ? `[${address}]` : address));

    return (nameservers.length ? nameservers : fallbackResolvers).join(' ');
}

module.exports = {errorWrapper, parseResolvers};
