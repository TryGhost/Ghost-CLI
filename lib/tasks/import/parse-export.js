/* eslint-disable camelcase -- these mirror Ghost's database column names */
const {readJSONSync} = require('../../utils/json');
const semver = require('semver');

const {SystemError} = require('../../errors');

const pre1xVersion = /^00[1-9]$/;

function parse(content) {
    const data = content.db?.[0]?.data ?? (content.data || null);
    /* istanbul ignore next */
    const {id: role_id} = data.roles?.find(role => role.name === 'Owner') || {};
    /* istanbul ignore next */
    const {user_id} = data.roles_users?.find(roleUser => roleUser.role_id === role_id) || {};
    /* istanbul ignore next */
    const {name, email} = data.users?.find(user => user.id === user_id) || {};
    /* istanbul ignore next */
    const {value: blogTitle} = data.settings?.find(setting => setting.key === 'title') || {};

    return {name, email, blogTitle};
}

module.exports = function parseExport(file) {
    let content = {};

    try {
        content = readJSONSync(file);
    } catch (err) {
        throw new SystemError({
            message: 'Import file not found or is not valid JSON',
            err
        });
    }

    const version = content.db?.[0]?.meta?.version ?? content.meta?.version ?? null;
    if (!version) {
        throw new SystemError('Unable to determine export version');
    }

    const validVersion = pre1xVersion.test(version) || semver.valid(version);
    if (!validVersion) {
        throw new SystemError(`Unrecognized export version: ${version}`);
    }

    const data = parse(content);
    return {
        version: pre1xVersion.test(version) ? '0.11.14' : version,
        data
    };
};
