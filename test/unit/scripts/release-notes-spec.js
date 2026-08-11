'use strict';
const expect = require('chai').expect;

const {buildReleaseNotes, NO_CHANGES_MESSAGE} = require('../../../scripts/release-notes');

function bodyOf(notes) {
    return notes.split('\n\n---\n\n')[0];
}

describe('Unit: Scripts > release-notes', function () {
    it('includes the compare link', function () {
        const notes = buildReleaseNotes([], 'v1.30.0', 'v1.30.1');

        expect(notes).to.contain('https://github.com/TryGhost/Ghost-CLI/compare/v1.30.0...v1.30.1');
    });

    it('falls back to a generic message when nothing is user-facing', function () {
        const notes = buildReleaseNotes([
            '* Update dependency mysql2 to v3.23.2 (#2257) - renovate[bot]',
            '* chore(release): 1.30.1 - Ghost CI'
        ], 'v1.30.0', 'v1.30.1');

        expect(bodyOf(notes)).to.equal(NO_CHANGES_MESSAGE);
    });

    it('keeps only commits with a user-facing emoji', function () {
        const notes = buildReleaseNotes([
            '* 🐛 Fixed X-Forwarded-For header in nginx config (#2254) - Someone',
            '* Update pnpm to v11.20.0 (#2266) - renovate[bot]'
        ], 'v1.30.0', 'v1.30.1');

        expect(bodyOf(notes)).to.equal('* 🐛 Fixed X-Forwarded-For header in nginx config (#2254) - Someone');
    });

    it('sorts by emoji priority', function () {
        const notes = buildReleaseNotes([
            '* 💡 Noted a thing - Someone',
            '* 🐛 Fixed a thing - Someone',
            '* ✨ Added a thing - Someone',
            '* 🔒 Secured a thing - Someone'
        ], 'v1.30.0', 'v1.31.0');

        expect(bodyOf(notes).split('\n')).to.deep.equal([
            '* 🔒 Secured a thing - Someone',
            '* ✨ Added a thing - Someone',
            '* 🐛 Fixed a thing - Someone',
            '* 💡 Noted a thing - Someone'
        ]);
    });

    it('deduplicates identical entries', function () {
        const notes = buildReleaseNotes([
            '* 🐛 Fixed a thing - Someone',
            '* 🐛 Fixed a thing - Someone'
        ], 'v1.30.0', 'v1.30.1');

        expect(bodyOf(notes)).to.equal('* 🐛 Fixed a thing - Someone');
    });
});
