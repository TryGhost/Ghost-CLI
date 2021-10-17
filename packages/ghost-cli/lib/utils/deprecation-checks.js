const semver = require('semver');
const boxen = require('boxen');
const chalk = require('chalk');

const nodeDeprecated = () => boxen(chalk.yellow(`
The current Node.js version (${process.versions.node}) has reached end-of-life status.
Ghost-CLI will drop support for this Node.js version in an upcoming release, please update your Node.js version.
See ${chalk.cyan('https://ghost.org/docs/faq/node-versions/')}.
`.trim()), {borderColor: 'yellow', align: 'center'});

const ghostDeprecated = () => boxen(chalk.yellow(`
Ghost 3.x has reached end-of-life status.
Ghost-CLI will drop support for unmaintained Ghost versions in an upcoming release, please update your Ghost version.
See ${chalk.cyan('https://ghost.org/docs/faq/major-versions-lts/')}.
`.trim()), {borderColor: 'yellow', align: 'center'});

async function deprecationChecks(ui, system) {
    if (semver.lt(process.versions.node, '12.0.0')) {
        ui.log(nodeDeprecated());
    }

    const showGhostDeprecation = (await system.getAllInstances(false))
        .some(instance => instance.version && semver.lt(instance.version, '3.0.0'));

    if (showGhostDeprecation) {
        ui.log(ghostDeprecated());
    }
}

module.exports = deprecationChecks;
