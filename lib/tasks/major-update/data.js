'use strict';

module.exports = function getData(options = {}) {
    const path = require('path');
    const errors = require('../../errors');

    if (!options.dir) {
        return Promise.reject(new errors.CliError({
            message: '`dir` is required.'
        }));
    }

    if (!options.database) {
        return Promise.reject(new errors.CliError({
            message: '`database` is required.'
        }));
    }

    const knexPath = path.resolve(options.dir, options.version, 'node_modules', 'knex');
    const gscanPath = path.resolve(options.dir, options.version, 'node_modules', 'gscan');

    const knex = require(knexPath);
    const gscan = require(gscanPath);

    const connection = knex(Object.assign({useNullAsDefault: true}, options.database));

    let themeFolder = path.resolve(options.dir, 'content', 'themes');
    let gscanReport;

    return connection.raw('SELECT * FROM settings WHERE `key`="active_theme";')
        .then((response) => {
            let	activeTheme;

            if (options.database.client === 'mysql') {
                activeTheme = response[0][0].value;
            } else {
                activeTheme = response[0].value;
            }

            // CASE: use casper from v2 folder, otherwise we are validating the old casper
            if (activeTheme === 'casper') {
                themeFolder = path.resolve(options.dir, options.version, 'content', 'themes');
            }

            return gscan.check(path.resolve(themeFolder, activeTheme));
        })
        .then((report) => {
            gscanReport = gscan.format(report, {sortByFiles: true});

            return connection.raw('SELECT uuid FROM posts WHERE slug="v2-demo-post";');
        })
        .then((response) => {
            let demoPost;

            if (options.database.client === 'mysql') {
                demoPost = response[0][0];
            } else {
                demoPost = response[0];
            }

            return {
                gscanReport: gscanReport,
                demoPost: demoPost
            };
        })
        .then(response => new Promise((resolve) => {
            connection.destroy(() => {
                resolve(response);
            });
        }))
        .catch(err => new Promise((resolve, reject) => {
            connection.destroy(() => {
                reject(err);
            });
        }));
};
