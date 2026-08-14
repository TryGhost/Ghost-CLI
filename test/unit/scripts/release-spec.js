'use strict';

const {detectBumpType} = require('../../../scripts/release');

describe('Unit: Scripts > release', function () {
    describe('detectBumpType', function () {
        it('passes through an explicit bump type', function () {
            expect(detectBumpType(['✨ Added a thing'], 'patch')).to.equal('patch');
            expect(detectBumpType(['Fixed a thing'], 'major')).to.equal('major');
        });

        it('detects features from emoji commits', function () {
            expect(detectBumpType([
                'Update pnpm to v11.20.0 (#2266)',
                '✨ Added support for Ubuntu 26.04 LTS (#2271)'
            ], 'auto')).to.equal('minor');
        });

        it('defaults to patch without feature commits', function () {
            expect(detectBumpType([
                '🐛 Fixed X-Forwarded-For header in nginx config (#2254)',
                'Update pnpm to v11.20.0 (#2266)'
            ], 'auto')).to.equal('patch');
        });
    });
});
