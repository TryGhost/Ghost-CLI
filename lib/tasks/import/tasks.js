const semver = require('semver');
const validator = require('validator');

const {SystemError} = require('../../errors');
const parseExport = require('./parse-export');
const {isSetup, setup, runImport, downloadContentExport, downloadMembersExport, TOKEN_AUTH_MIN_VERSION} = require('./api');

const sessionAuthPrompts = [{
    type: 'string',
    name: 'username',
    message: 'Enter your Ghost administrator email address',
    validate: val => validator.isEmail(`${val}`) || 'You must specify a valid email'
}, {
    type: 'password',
    name: 'password',
    message: 'Enter your Ghost administrator password',
    validate: val => validator.isLength(`${val}`, {min: 10}) || 'Password must be at least 10 characters long'
}];

const staffTokenRegex = /^[0-9a-f]{24}:[0-9a-f]{64}$/;

const staffTokenAuthPrompts = [{
    type: 'string',
    name: 'token',
    message: 'Enter your Ghost Staff access token',
    validate: val => staffTokenRegex.test(val) || 'Token must follow the "{A}:{B}" format, where A is 24 hex characters and B is 64 hex characters'
}];

/**
 * Gets authentication data for the export tasks
 * @param{ import('../../ui/index.js')} ui
 * @param {string} version
 */
async function getAuthData(ui, version) {
    const isSessionAuth = semver.lt(version, TOKEN_AUTH_MIN_VERSION);
    if (isSessionAuth) {
        return await ui.prompt(sessionAuthPrompts);
    }

    // Case: GHOST_CLI_STAFF_AUTH_TOKEN is defined, use it for the token
    const envToken = process.env.GHOST_CLI_STAFF_AUTH_TOKEN;
    if (envToken) {
        const valid = staffTokenRegex.test(envToken);
        if (!valid) {
            throw new SystemError('GHOST_CLI_STAFF_AUTH_TOKEN is not a valid token. It must follow the "{A}:{B}" format, where A is 24 hex characters and B is 64 hex characters');
        }

        return {token: envToken};
    }

    // Case: GHOST_CLI_STAFF_AUTH_TOKEN is not defined, prompt for it
    return await ui.prompt(staffTokenAuthPrompts);
}

/**
 * @param {import('../../ui/index.js')} ui
 * @param {import('../../instance.js')} instance
 * @param {string} exportFile
 */
async function importTask(ui, instance, exportFile) {
    const {data} = parseExport(exportFile);
    const url = instance.config.get('url');

    let prompts = sessionAuthPrompts;

    const blogIsSetup = await isSetup(instance.version, url);
    if (!blogIsSetup) {
        prompts = sessionAuthPrompts.slice(1);
    }

    const {username, password} = await ui.prompt(prompts);
    const importUsername = username || data.email;

    return ui.listr([{
        title: 'Running blog setup',
        task: () => setup(instance.version, url, {...data, password}),
        enabled: () => !blogIsSetup
    }, {
        title: 'Running blog import',
        task: () => runImport(instance.version, url, {username: importUsername, password}, exportFile)
    }], false);
}

/**
 * @param {import('../../ui/index.js')} ui
 * @param {import('../../instance.js')} instance
 * @param {string} contentFile
 * @param {string} [membersFile]
 */
async function exportTask(ui, instance, contentFile, membersFile) {
    const url = instance.config.get('url');
    const {version} = instance;

    const blogIsSetup = await isSetup(version, url);
    if (!blogIsSetup) {
        throw new SystemError('Cannot export content from a blog that hasn\'t been set up.');
    }

    const currentMfaConfig = instance.config.get('security.staffDeviceVerification');
    // CASE: User config doesn't have the property; the default value is true
    // CASE: User config has the property, and it's truthy
    // CASE: User config was set using `ghost config set security.staffDeviceVerification false`
    const mfaEnabled = currentMfaConfig === undefined || (currentMfaConfig && currentMfaConfig !== 'false');

    if (mfaEnabled && semver.satisfies(version, `>=5.118.0 <${TOKEN_AUTH_MIN_VERSION}`)) {
        throw new SystemError({
            message: 'Staff Device Verification is enabled, so backups might fail with password auth.\n' +
                `Upgrade to Ghost v${TOKEN_AUTH_MIN_VERSION} or later to use a Staff access token instead.`
        });
    }

    const authData = await getAuthData(ui, version);

    await downloadContentExport(version, url, authData, contentFile);

    if (membersFile) {
        await downloadMembersExport(version, url, authData, membersFile);
    }
}

module.exports = {
    importTask,
    exportTask
};
