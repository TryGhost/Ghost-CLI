const {dirname} = require('path');
const debug = require('debug')('ghost-cli:find-instance');
const chalk = require('chalk');
const checkValidInstall = require('./check-valid-install');

const isRoot = () => dirname(process.cwd()) === process.cwd();

const die = (name) => {
    console.error(`${chalk.yellow('Working directory is not a recognisable Ghost installation.')}
Run \`ghost ${name}\` again within a folder where Ghost was installed with Ghost-CLI.`);
    process.exit(1);
};

function findValidInstallation(name = '', recursive = false) {
    while (!isRoot()) {
        debug(`Checking valid install: ${process.cwd()}`);
        const isValidInstall = checkValidInstall(name);

        if (isValidInstall) {
            return;
        }

        if (isValidInstall === false) {
            process.exit(1);
        }

        if (!recursive) {
            return die(name);
        }

        debug(`Going up...`);
        process.chdir('..');
    }

    die(name);
}

module.exports = findValidInstallation;
