'use strict';

// Prepares a Ghost-CLI release: works out the next version from the commits
// since the last tag, writes it to package.json, and pushes a
// `chore(release): <version>` commit. Pushing that commit is what triggers the
// "Publish to npm" workflow, which publishes, tags, and creates the GitHub
// release (with notes from scripts/release-notes.js).
const {execSync} = require('child_process');
const {readFileSync, writeFileSync} = require('fs');
const path = require('path');
const semver = require('semver');

const ROOT_DIR = path.join(__dirname, '..');
const PKG_PATH = path.join(ROOT_DIR, 'package.json');

const BUMP_TYPES = ['auto', 'patch', 'minor', 'major'];

// Commits carrying one of these mark a user-facing feature, which means a minor
// bump rather than a patch.
const FEATURE_MARKERS = ['✨', '🎉', ':sparkles:'];

function run(cmd, opts) {
    return execSync(cmd, Object.assign({cwd: ROOT_DIR, encoding: 'utf8'}, opts)).trim();
}

function log(msg) {
    console.log(`  ${msg}`);
}

function logStep(msg) {
    console.log(`\n▸ ${msg}`);
}

function parseOptions() {
    // Defaults come from RELEASE_* env vars so CI can set them on the job and
    // invoke the script bare. A passed CLI flag still wins.
    const options = {
        bumpType: process.env.RELEASE_BUMP_TYPE || 'auto',
        branch: process.env.RELEASE_BRANCH || 'main',
        dryRun: process.env.RELEASE_DRY_RUN === 'true'
    };

    for (const arg of process.argv.slice(2)) {
        if (arg === '--dry-run') {
            options.dryRun = true;
        } else if (arg.startsWith('--bump-type=')) {
            options.bumpType = arg.slice('--bump-type='.length);
        } else if (arg.startsWith('--branch=')) {
            options.branch = arg.slice('--branch='.length);
        } else {
            throw new Error(`Unknown argument: ${arg}`);
        }
    }

    if (!BUMP_TYPES.includes(options.bumpType)) {
        throw new Error(`Invalid bump type "${options.bumpType}" — expected one of: ${BUMP_TYPES.join(', ')}`);
    }

    return options;
}

function readVersion() {
    return JSON.parse(readFileSync(PKG_PATH, 'utf8')).version;
}

// Rewrite the version in place rather than re-serialising the JSON, so the
// release commit only ever touches the one line.
function writeVersion(version) {
    const contents = readFileSync(PKG_PATH, 'utf8');
    const updated = contents.replace(/("version":\s*)"[^"]+"/, `$1"${version}"`);

    if (updated === contents) {
        throw new Error('Failed to update the version in package.json');
    }

    writeFileSync(PKG_PATH, updated, 'utf8');
}

// The tag for the released version normally exists, but fall back to the most
// recent tag in HEAD's ancestry if a release ever lands without one.
function resolveBaseTag(version) {
    const tag = `v${version}`;

    try {
        run(`git rev-parse --verify --quiet refs/tags/${tag}`, {stdio: 'pipe'});
        return tag;
    } catch {
        const described = run(`git describe --tags --abbrev=0 --match 'v[0-9]*'`);
        log(`Tag ${tag} not found, falling back to ${described}`);
        return described;
    }
}

/**
 * Resolves the requested bump type against the commits being released.
 *
 * @param {string[]} commits - One-line commit summaries since the base tag
 * @param {string} bumpType - Requested bump type (auto, patch, minor, major)
 * @returns {string} The resolved bump type
 */
function detectBumpType(commits, bumpType) {
    if (bumpType !== 'auto') {
        return bumpType;
    }

    const features = commits.filter(commit => FEATURE_MARKERS.some(marker => commit.includes(marker)));

    if (features.length) {
        log(`Feature commits detected (${features.length}), bumping to minor`);
        return 'minor';
    }

    log('No feature commits detected, defaulting to patch');
    return 'patch';
}

function main() {
    const options = parseOptions();

    console.log('Ghost-CLI Release');
    console.log('=================');
    log(`Branch: ${options.branch}`);
    log(`Bump type: ${options.bumpType}`);
    log(`Dry run: ${options.dryRun}`);

    logStep('Checking working tree');
    if (run('git status --porcelain')) {
        throw new Error('Working tree is not clean — commit or stash your changes first');
    }

    logStep('Reading current version');
    const currentVersion = readVersion();
    log(`Current version: ${currentVersion}`);

    const baseTag = resolveBaseTag(currentVersion);
    log(`Base tag: ${baseTag}`);

    logStep('Detecting bump type');
    const commits = run(`git log --first-parent --no-merges --pretty=tformat:'%s' ${baseTag}..HEAD`)
        .split('\n').filter(Boolean);

    if (!commits.length) {
        throw new Error(`No commits since ${baseTag} — nothing to release`);
    }

    log(`${commits.length} commit(s) since ${baseTag}`);
    const resolvedBumpType = detectBumpType(commits, options.bumpType);

    const newVersion = semver.inc(currentVersion, resolvedBumpType);
    if (!newVersion) {
        throw new Error(`Failed to calculate a ${resolvedBumpType} bump from ${currentVersion}`);
    }
    log(`New version: ${newVersion}`);

    logStep('Checking remote tags');
    if (run(`git ls-remote --tags origin refs/tags/v${newVersion}`)) {
        throw new Error(`Tag v${newVersion} already exists on the remote`);
    }
    log(`Tag v${newVersion} is free`);

    logStep(`Bumping version to ${newVersion}`);
    writeVersion(newVersion);
    run('git add package.json');
    run(`git commit -m "chore(release): ${newVersion}"`);

    if (options.dryRun) {
        logStep('DRY RUN — skipping push');
        log(`Would push the release commit to ${options.branch}`);
    } else {
        logStep('Pushing');
        run(`git push origin HEAD:${options.branch}`);
        log(`Pushed chore(release): ${newVersion}`);
    }

    console.log(`\n✓ Release ${newVersion} prepared`);
    log('The "Publish to npm" workflow publishes, tags, and creates the GitHub release');
}

module.exports = {detectBumpType};

if (require.main === module) {
    try {
        main();
    } catch (error) {
        console.error(`\n✗ Release failed: ${error.message}`);
        process.exit(1);
    }
}
