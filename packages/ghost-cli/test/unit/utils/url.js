'use strict';

const {expect} = require('chai');

const url = require('../../../lib/utils/url');

describe('Unit: Utils > URL', function () {
    describe('> Validate', function () {
        it('non-URLs fail', function () {
            expect(url.validate('totally a url')).to.match(/Invalid domain/);
            expect(url.validate('notaurl')).to.match(/Invalid domain/);
        });

        it('protocol-free URLs fail', function () {
            expect(url.validate('myghost.blog')).to.match(/include a protocol/);
        });

        it('trailing `ghost` subdir fails', function () {
            expect(url.validate('https://myghost.blog/myghost/')).to.be.true;
            expect(url.validate('https://myghost.blog/ghosted/')).to.be.true;
            expect(url.validate('https://myghost.blog/ghost')).to.match(/path that ends with `ghost`/);
            expect(url.validate('https://myghost.blog/ghost/')).to.match(/path that ends with `ghost`/);
        });

        it('everything else works', function () {
            expect(url.validate('http://localhost:2368/')).to.be.true;
            expect(url.validate('http://localhost:2368/testing')).to.be.true;
            expect(url.validate('https://myghost.blog/')).to.be.true;
            expect(url.validate('https://ghost.org/blog')).to.be.true;
            expect(url.validate('https://blog.ghost.org/')).to.be.true;
        });
    });

    describe('> isCustomDomain', function () {
        it('localhost fails', function () {
            expect(url.isCustomDomain('localhost')).to.be.false;
        });

        it('localhost with port fails', function () {
            expect(url.isCustomDomain('localhost:2368')).to.be.false;
        });

        it('localhost with protocol fails', function () {
            expect(url.isCustomDomain('http://localhost')).to.be.false;
        });

        it('IP address fails', function () {
            expect(url.isCustomDomain('168.123.45.1')).to.be.false;
        });

        it('IP with port fails', function () {
            expect(url.isCustomDomain('168.123.45.1:2368')).to.be.false;
        });

        it('IP with protocol fails', function () {
            expect(url.isCustomDomain('http://168.123.45.1')).to.be.false;
        });

        it('domain with one TLD passes', function () {
            expect(url.isCustomDomain('example.com')).to.be.true;
        });

        it('domain with two TLDs passes', function () {
            expect(url.isCustomDomain('example.co.uk')).to.be.true;
        });

        it('domain with protocol passes', function () {
            expect(url.isCustomDomain('http://example.com')).to.be.true;
        });
    });

    describe('> ensureProtocol', function () {
        it('adds http to localhost', function () {
            expect(url.ensureProtocol('localhost')).to.eql('http://localhost');
        });

        it('adds http to localhost with port', function () {
            expect(url.ensureProtocol('localhost:2368')).to.eql('http://localhost:2368');
        });

        it('adds http to localhost with slasshes', function () {
            expect(url.ensureProtocol('//localhost')).to.eql('http://localhost');
        });

        it('does not add http to localhost with protocol', function () {
            expect(url.ensureProtocol('http://localhost')).to.eql('http://localhost');
        });

        it('adds http to IP address', function () {
            expect(url.ensureProtocol('168.123.45.1')).to.eql('http://168.123.45.1');
        });

        it('adds http to IP with port', function () {
            expect(url.ensureProtocol('168.123.45.1:2368')).to.eql('http://168.123.45.1:2368');
        });

        it('adds http to IP address with slasshes', function () {
            expect(url.ensureProtocol('//168.123.45.1')).to.eql('http://168.123.45.1');
        });

        it('does not add http to IP with protocol', function () {
            expect(url.ensureProtocol('http://168.123.45.1')).to.eql('http://168.123.45.1');
        });

        it('adds https to domain with one TLD', function () {
            expect(url.ensureProtocol('example.com')).to.eql('https://example.com');
        });

        it('adds https to domain with two TLDs', function () {
            expect(url.ensureProtocol('example.co.uk')).to.eql('https://example.co.uk');
        });

        it('adds https to domain with slashes', function () {
            expect(url.ensureProtocol('//example.com')).to.eql('https://example.com');
        });

        it('does not add https to domain with protocol', function () {
            expect(url.ensureProtocol('http://example.com')).to.eql('http://example.com');
        });
    });
});
