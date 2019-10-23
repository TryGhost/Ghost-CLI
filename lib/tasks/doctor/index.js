'use strict';
const flatten = require('lodash/flatten');
const intersection = require('lodash/intersection');

const builtInChecks = [
    require('./node-version'),
    require('./logged-in-user'),
    require('./logged-in-ghost-user'),
    require('./logged-in-user-owner'),
    require('./install-folder-permissions'),
    require('./system-stack'),
    require('./mysql'),
    require('./validate-config'),
    require('./folder-permissions'),
    require('./file-permissions'),
    require('./content-folder'),
    require('./check-memory'),
    require('./binary-deps')
];

module.exports = async function doctor(ui, system, categories = [], runAll = true) {
    const extensionChecks = await system.hook('doctor');
    const checks = builtInChecks.concat(flatten(extensionChecks).filter(Boolean))
        .filter(({category}) => category && intersection(categories, category).length > 0);

    if (!checks.length) {
        return null;
    }

    return ui.listr(checks, false, {exitOnError: !runAll});
};
