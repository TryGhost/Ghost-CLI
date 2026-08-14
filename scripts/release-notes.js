'use strict';

// Generates user-facing release notes from the commit log between two tags.
// Adapted from TryGhost/Ghost's scripts/lib/release-notes.js so both repos
// produce the same shape of release notes from the same emoji convention.
const {execSync} = require('child_process');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const REPO_URL = 'https://github.com/TryGhost/Ghost-CLI';

// Emoji priority order (lowest index = lowest priority, sorted descending)
const EMOJI_ORDER = ['💡', '🐛', '🎨', '💄', '✨', '🔒'];

// User-facing emojis — only these are included in release notes
const USER_FACING_EMOJIS = new Set(EMOJI_ORDER);

const NO_CHANGES_MESSAGE = 'This release contains fixes for minor bugs and issues reported by Ghost users.';

function getCommitLog(fromTag, toTag) {
    const range = `${fromTag}..${toTag}`;
    const format = '* %s - %an';
    // --first-parent keeps us on the mainline: PRs are squash-merged, so every
    // real change is a single commit there.
    const cmd = `git log --first-parent --no-merges --pretty=tformat:'${format}' ${range}`;

    let log;
    try {
        log = execSync(cmd, {cwd: ROOT_DIR, encoding: 'utf8'}).trim();
    } catch {
        return [];
    }

    if (!log) {
        return [];
    }

    return log.split('\n').map(line => line.trim());
}

function extractLeadingEmoji(line) {
    // Line format: * <message> - <author>
    const match = line.match(/^\* (.)/u);
    return match ? match[1] : '';
}

function filterAndSortByEmoji(lines) {
    const emojiLines = lines.filter((line) => {
        return USER_FACING_EMOJIS.has(extractLeadingEmoji(line));
    });

    emojiLines.sort((a, b) => {
        const indexA = EMOJI_ORDER.indexOf(extractLeadingEmoji(a));
        const indexB = EMOJI_ORDER.indexOf(extractLeadingEmoji(b));
        return indexB - indexA;
    });

    return emojiLines;
}

/**
 * Builds the release notes body from an already-collected commit log.
 *
 * @param {string[]} lines - Commit log lines in `* <message> - <author>` format
 * @param {string} fromTag - The previous release tag
 * @param {string} toTag - The tag being released
 * @returns {string}
 */
function buildReleaseNotes(lines, fromTag, toTag) {
    const filtered = filterAndSortByEmoji(lines);

    let body;
    if (!filtered.length) {
        body = NO_CHANGES_MESSAGE;
    } else {
        // Deduplicate (preserving order)
        body = [...new Set(filtered)].join('\n');
    }

    body += `\n\n---\n\nView the changelog for full details: ${REPO_URL}/compare/${fromTag}...${toTag}`;

    return body;
}

/**
 * Generates release notes for the commits between two tags.
 *
 * @param {string} fromTag - The previous release tag
 * @param {string} toTag - The tag being released
 * @returns {string}
 */
function generateReleaseNotes(fromTag, toTag) {
    return buildReleaseNotes(getCommitLog(fromTag, toTag), fromTag, toTag);
}

module.exports = {
    EMOJI_ORDER,
    NO_CHANGES_MESSAGE,
    buildReleaseNotes,
    generateReleaseNotes
};

// CLI: node scripts/release-notes.js <from-tag> <to-tag>
if (require.main === module) {
    const [fromTag, toTag] = process.argv.slice(2);

    if (!fromTag || !toTag) {
        console.error('Usage: node scripts/release-notes.js <from-tag> <to-tag>');
        process.exit(1);
    }

    process.stdout.write(generateReleaseNotes(fromTag, toTag));
}
