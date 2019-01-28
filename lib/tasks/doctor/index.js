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

module.exports = function doctor(ui, system, categories = [], runAll = true) {
    return system.hook('doctor').then((extensionChecks) => {
        const checks = builtInChecks
            .concat(flatten(extensionChecks).filter(Boolean))
            .filter(({category}) => intersection(categories, category).length);

        if (!checks.length) {
            return null;
        }

        return ui.listr(checks, false, {exitOnError: !runAll});
    });
};
