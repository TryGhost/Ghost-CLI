'use strict';

const {expect} = require('chai');

const validateURL = require('../../../lib/utils/validate-instance-url');

describe('Unit: Utils > validateInstanceURL', function () {
    it('non-URLs fail', function () {
        expect(validateURL('totally a url')).to.match(/Invalid URL/);
        expect(validateURL('notaurl')).to.match(/Invalid URL/);
    });

    it('protocol-free URLs fail', function () {
        expect(validateURL('myghost.blog')).to.match(/include a protocol/);
    });

    it('trailing `ghost` subdir fails', function () {
        expect(validateURL('https://myghost.blog/myghost/')).to.be.true;
        expect(validateURL('https://myghost.blog/ghosted/')).to.be.true;
        expect(validateURL('https://myghost.blog/ghost')).to.match(/path that ends with `ghost`/);
        expect(validateURL('https://myghost.blog/ghost/')).to.match(/path that ends with `ghost`/);
    });

    it('everything else works', function () {
        expect(validateURL('http://localhost:2368/')).to.be.true;
        expect(validateURL('http://localhost:2368/testing')).to.be.true;
        expect(validateURL('https://myghost.blog/')).to.be.true;
        expect(validateURL('https://ghost.org/blog')).to.be.true;
        expect(validateURL('https://blog.ghost.org/')).to.be.true;
    });
});
