'use strict';
const expect = require('chai').expect;

const {parseResolvers} = require('../utils');

describe('Unit: Extensions > Nginx > Utils', function () {
    describe('parseResolvers', function () {
        it('pulls nameservers out of resolv.conf', function () {
            const contents = [
                '# This is /run/systemd/resolve/stub-resolv.conf',
                'nameserver 127.0.0.53',
                '  nameserver 10.0.0.1  ',
                'options edns0 trust-ad',
                'search .'
            ].join('\n');

            expect(parseResolvers(contents)).to.equal('127.0.0.53 10.0.0.1');
        });

        it('wraps ipv6 addresses in square brackets', function () {
            expect(parseResolvers('nameserver 2606:4700:4700::1111')).to.equal('[2606:4700:4700::1111]');
        });

        it('ignores anything that isn\'t a valid ip', function () {
            expect(parseResolvers('nameserver not-an-ip\nnameserver 10.0.0.1')).to.equal('10.0.0.1');
        });

        it('falls back to public resolvers if there are none', function () {
            expect(parseResolvers('search .\noptions edns0')).to.equal('1.1.1.1 8.8.8.8');
            expect(parseResolvers('')).to.equal('1.1.1.1 8.8.8.8');
            expect(parseResolvers(null)).to.equal('1.1.1.1 8.8.8.8');
        });
    });
});
