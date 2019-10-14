'use strict';
const parseUrl = require('url').parse;
const tunnel = require('tunnel');
const getProxyForUrl = require('proxy-from-env').getProxyForUrl;

const NPM_REGISTRY = 'https://registry.npmjs.org/';

let proxyAgent = false;

module.exports = function getProxyAgent() {
    // Initialize Proxy Agent for proxy support if needed
    // console.log('Initializing Tunnel Agent if needed');
    const proxyAddress = getProxyForUrl(NPM_REGISTRY);
    if (proxyAddress) {
        const parsedProxyUrl = parseUrl(proxyAddress);
        proxyAgent = tunnel.httpsOverHttp({
            proxy: {
                host: parsedProxyUrl.hostname,
                port: parsedProxyUrl.port
            }
        });
    }

    return proxyAgent;
};
