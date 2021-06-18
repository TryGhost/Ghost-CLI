const fs = require('fs-extra');
const get = require('lodash/get');
const find = require('lodash/find');
const semver = require('semver');

const {SystemError} = require('../../errors');

const pre1xVersion = /^00[1-9]$/;

/* eslint-disable camelcase */
function parse(content) {
    const data = get(content, 'db[0].data', content.data || null);
    /* istanbul ignore next */
    const {id: role_id} = find(data.roles, {name: 'Owner'}) || {};
    /* istanbul ignore next */
    const {user_id} = find(data.roles_users, {role_id}) || {};
    /* istanbul ignore next */
    const {name, email} = find(data.users, {id: user_id}) || {};
    /* istanbul ignore next */
    const {value: blogTitle} = find(data.settings, {key: 'title'}) || {};

    return {name, email, blogTitle};
}
/* eslint-enable camelcase */

module.exports = function parseExport(file) {
    let content = {};

    try {
        content = fs.readJsonSync(file);
    } catch (err) {
        throw new SystemError({
            message: 'Import file not found or is not valid JSON',
            err
        });
    }

    const version = get(content, 'db[0].meta.version', get(content, 'meta.version', null));
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
