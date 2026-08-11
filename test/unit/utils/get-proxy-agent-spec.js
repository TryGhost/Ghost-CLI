const {expect} = require('chai');
const proxyquire = require('proxyquire').noCallThru();

function load(proxyAddress) {
    return proxyquire('../../../lib/utils/get-proxy-agent', {
        'proxy-from-env': {getProxyForUrl: () => proxyAddress}
    });
}

describe('Unit: Utils > get-proxy-agent', function () {
    it('returns false if no proxy is configured', function () {
        expect(load('')()).to.be.false;
    });

    it('returns an agent instance if a proxy is configured', function () {
        const {HttpsProxyAgent} = require('https-proxy-agent');
        const agent = load('http://localhost:8080')();

        expect(agent).to.be.an.instanceof(HttpsProxyAgent);
        expect(agent.proxy.href).to.equal('http://localhost:8080/');
    });
});
