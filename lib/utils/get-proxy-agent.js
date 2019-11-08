const {getProxyForUrl} = require('proxy-from-env');
const NPM_REGISTRY = 'https://registry.npmjs.org/';

let proxyAgent = false;

module.exports = function getProxyAgent() {
    // Initialize Proxy Agent for proxy support if needed
    const proxyAddress = getProxyForUrl(NPM_REGISTRY);
    if (proxyAddress && !proxyAgent) {
        const HttpsProxyAgent = require('https-proxy-agent');
        proxyAgent = new HttpsProxyAgent(proxyAddress);
    }

    return proxyAgent;
};
