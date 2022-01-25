const fs = require('fs');
const path = require('path');
const semver = require('semver');
const AdmZip = require('adm-zip');
const packageJson = require('package-json');

const cliPackage = require('../../package.json');
const {CliError, SystemError} = require('../errors');
const getProxyAgent = require('./get-proxy-agent');

const MIN_RELEASE = '>= 1.0.0';

const utils = {
    async loadVersions(includePrerelease = false) {
        const result = await packageJson('ghost', {
            allVersions: true,
            agent: getProxyAgent()
        });
        const versions = Object.keys(result.versions)
            .filter(v => semver.satisfies(v, MIN_RELEASE, {includePrerelease}))
            .sort(semver.rcompare);

        const deprecations = Object.keys(result.versions)
            .reduce((obj, v) => {
                if (result.versions[v].deprecated) {
                    obj[v] = result.versions[v].deprecated;
                }

                return obj;
            }, {});

        if (!versions.length) {
            return {
                latest: null,
                latestMajor: {},
                all: [],
                deprecations: {}
            };
        }

        const latestMajor = versions.reduce((majors, v) => {
            const key = `v${semver.major(v)}`;

            if (!majors[key] && !deprecations[v]) {
                majors[key] = v;
            }

            return majors;
        }, {});

        return {
            latest: versions.find(v => !deprecations[v]),
            latestMajor,
            all: versions,
            deprecations
        };
    },

    checkCustomVersion(version, versions, activeVersion, opts = {}) {
        const parsed = semver.coerce(version);

        if (!parsed) {
            throw new CliError({
                message: `Invalid custom version specified: ${version}`,
                log: false
            });
        }

        if (!semver.satisfies(parsed, MIN_RELEASE)) {
            throw new CliError({
                message: 'Ghost-CLI cannot install versions of Ghost less than 1.0.0',
                log: false
            });
        }

        if (!opts.zip && !versions.includes(parsed.version)) {
            throw new CliError({
                message: `Version ${parsed.version} does not exist`,
                log: false
            });
        }

        if (!opts.zip && opts.v1 && parsed.major > 1) {
            throw new CliError({
                message: 'The --v1 flag was provided, but the custom version specified was v2 or greater',
                help: 'Either remove the --v1 flag, or don\'t specify a custom version',
                log: false
            });
        }

        if (!opts.force && activeVersion && semver.lt(parsed, activeVersion)) {
            const message = opts.zip ? 'Version in zip file' : 'The custom version specified';

            throw new CliError({
                message: `${message}: ${version}, is less than the current active version: ${activeVersion}`,
                log: false
            });
        }

        return parsed.version;
    },

    checkActiveVersion(activeVersion, versionToUse, latestMajorVersions, opts = {}) {
        const activeMajor = semver.major(activeVersion);

        if (opts.v1 && activeMajor > 1) {
            throw new CliError({
                message: 'The --v1 flag was provided, but the current version of Ghost is v2 or greater',
                help: 'Re-run the command without the --v1 flag',
                log: false
            });
        }

        if (semver.lte(versionToUse, activeVersion) && !opts.force) {
            return null;
        }

        const latestMajor = latestMajorVersions[`v${activeMajor}`];

        if (activeVersion !== latestMajor && ['major', 'premajor'].includes(semver.diff(activeVersion, versionToUse))) {
            const majorToUse = semver.major(versionToUse);

            throw new CliError({
                message: `Unable to update Ghost directly to v${versionToUse}. You must be on the latest v${activeMajor}.x to update across major versions.`,
                help: `Run "ghost update v${activeMajor}" to get the latest v${activeMajor}.x version, then run "ghost update" to get to v${majorToUse}.`
            });
        }

        return versionToUse;
    },

    async resolveVersion(customVersion = null, activeVersion = null, opts = {}) {
        const versions = await utils.loadVersions(opts.channel === 'next');

        if (!versions.all.length) {
            return null;
        }

        const latestVersion = opts.v1 ? versions.latestMajor.v1 : versions.latest;
        if (!customVersion && !activeVersion) {
            return latestVersion;
        }

        let version = null;
        if (customVersion) {
            const normalizedVersion = versions.latestMajor[customVersion.replace(/^v?/, 'v')] || customVersion;
            version = utils.checkCustomVersion(normalizedVersion, versions.all, activeVersion, opts);

            if (versions.deprecations[version] && !opts.force) {
                const deprecation = versions.deprecations[version];

                throw new CliError({
                    message: `You are trying to install Ghost v${version}, which has been deprecated with the following notice: "${deprecation}"`,
                    help: `Either pick a different version to install, or re-run with --force to install anyways.`
                });
            }
        }
        const latest = version || latestVersion;

        if (!activeVersion) {
            return latest;
        }

        return utils.checkActiveVersion(activeVersion, latest, versions.latestMajor, opts);
    },

    async versionFromZip(zipPath, activeVersion = null, opts = {}) {
        if (!path.isAbsolute(zipPath)) {
            zipPath = path.join(process.cwd(), zipPath);
        }

        if (!fs.existsSync(zipPath) || path.extname(zipPath) !== '.zip') {
            return Promise.reject(new SystemError('Zip file could not be found.'));
        }

        const zip = new AdmZip(zipPath);
        let pkg;

        try {
            pkg = JSON.parse(zip.readAsText('package.json'));
        } catch (e) {
            return Promise.reject(new SystemError('Zip file does not contain a valid package.json.'));
        }

        if (pkg.name !== 'ghost') {
            return Promise.reject(new SystemError('Zip file does not contain a Ghost release.'));
        }

        if (semver.lt(pkg.version, '1.0.0')) {
            return Promise.reject(new SystemError('Zip file contains pre-1.0 version of Ghost.'));
        }

        if (
            process.env.GHOST_NODE_VERSION_CHECK !== 'false' &&
            pkg.engines && pkg.engines.node && !semver.satisfies(process.versions.node, pkg.engines.node)
        ) {
            return Promise.reject(new SystemError('Zip file contains a Ghost version incompatible with the current Node version.'));
        }

        if (pkg.engines && pkg.engines.cli && !semver.satisfies(cliPackage.version, pkg.engines.cli, {includePrerelease: true})) {
            return Promise.reject(new SystemError({
                message: 'Zip file contains a Ghost version incompatible with this version of the CLI.',
                help: `Required: v${pkg.engines.cli}, current: v${cliPackage.version}`,
                suggestion: 'npm install -g ghost-cli@latest'
            }));
        }

        return utils.resolveVersion(pkg.version, activeVersion, {...opts, zip: true});
    }
};

module.exports = utils;
