const semver = require('semver');
const boxen = require('boxen');
const chalk = require('chalk');
const debug = require('debug')('ghost-cli:deprecation-checks');
const Promise = require('bluebird');

const nodeDeprecated = () => boxen(chalk.yellow(`
The current Node.js version (${process.versions.node}) has reached end-of-life status.
Ghost-CLI will drop support for this Node.js version in an upcoming release, please update your Node.js version.
See ${chalk.cyan('https://ghost.org/docs/faq/node-versions/')}.
`.trim()), {borderColor: 'yellow', align: 'center'});

const ghostDeprecated = () => boxen(chalk.yellow(`
Ghost 2.x has reached end-of-life status.
Ghost-CLI will drop support for unmaintained Ghost versions in an upcoming release, please update your Ghost version.
See ${chalk.cyan('https://ghost.org/docs/faq/major-versions-lts/')}.
`.trim()), {borderColor: 'yellow', align: 'center'});

const databaseDeprecated = () => boxen(chalk.yellow(`
Warning: MySQL 8 will be the required database in the next major release of Ghost.
Make sure your database is up to date to ensure forwards compatibility.
`.trim()), {borderColor: 'yellow', align: 'center'});

async function deprecationChecks(ui, system) {
    if (semver.lt(process.versions.node, '12.0.0')) {
        ui.log(nodeDeprecated());
    }

    const allInstances = await system.getAllInstances(false);

    const showGhostDeprecation = allInstances
        .some(instance => instance.version && semver.lt(instance.version, '3.0.0'));

    if (showGhostDeprecation) {
        ui.log(ghostDeprecated());
    }

    try {
        const showDatabaseDeprecation = (await Promise.mapSeries(allInstances, async (instance) => {
            instance.checkEnvironment();

            const isProduction = instance.system.production;
            const databaseClient = instance.config.get('database.client');

            if (isProduction && databaseClient === 'sqlite3') { // SQLite is only supported in development
                return true;
            } else if (databaseClient === 'mysql') {
                const mysqlExtension = instance.system._extensions.filter(e => e.pkg.name === 'ghost-cli-mysql');

                // This shouldn't happen, but still
                if (!mysqlExtension.length) {
                    return;
                }

                const dbconfig = instance.config.get('database.connection');
                const mysqlIsDeprecated = await mysqlExtension[0].isDeprecated(dbconfig);
                return mysqlIsDeprecated;
            }
        }))
            .filter(Boolean)
            .length;

        if (showDatabaseDeprecation) {
            ui.log(databaseDeprecated());
        }
    } catch (err) {
        debug('Unable to fetch DB deprecations', err);
    }
}

module.exports = deprecationChecks;
