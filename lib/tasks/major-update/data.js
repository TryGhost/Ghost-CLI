'use strict';

module.exports = async function getData({dir, database, versionFolder, version}) {
    const path = require('path');
    const semver = require('semver');
    const {CliError} = require('../../errors');

    if (!dir) {
        throw new CliError({message: '`dir` is required.'});
    }

    if (!database) {
        throw new CliError({message: '`database` is required.'});
    }

    const knexPath = path.resolve(dir, versionFolder, 'node_modules', 'knex');
    const gscanPath = path.resolve(dir, versionFolder, 'node_modules', 'gscan');
    const mysql2Path = path.resolve(dir, versionFolder, 'node_modules', 'mysql2');

    const knex = require(knexPath);
    const gscan = require(gscanPath);

    try {
        // If we're using MySQL, check to see if the `mysql2` lib exists because we
        // need to change the `client` to maintain backwards compatibility with config
        if (database.client === 'mysql') {
            require(mysql2Path);
            database.client = 'mysql2';
        }
    } catch (err) {
        // `mysql2` doesn't exist, so we can stay with `mysql`
    }

    const connection = knex({...database, useNullAsDefault: true});
    const query = async (sql) => {
        const response = await connection.raw(sql);

        if (['mysql', 'mysql2'].includes(database.client)) {
            return response[0][0];
        }

        return response[0];
    };

    let themeFolder = path.resolve(dir, 'content', 'themes');

    try {
        const {value: activeTheme} = await query('SELECT value FROM settings WHERE `key` = "active_theme";');

        // CASE: use casper from v2 folder, otherwise we are validating the old casper
        if (activeTheme === 'casper') {
            themeFolder = path.resolve(dir, versionFolder, 'content', 'themes');
        }

        const checkVersion = `v${semver.major(version)}`;
        const report = await gscan.check(path.resolve(themeFolder, activeTheme), {checkVersion});

        return {
            gscanReport: gscan.format(report, {sortByFiles: true, checkVersion}),
            demoPost: await query('SELECT uuid FROM posts WHERE `slug` = "v2-demo-post";')
        };
    } finally {
        await connection.destroy();
    }
};
