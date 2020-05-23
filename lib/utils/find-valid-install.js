const {dirname} = require('path');
const debug = require('debug')('ghost-cli:find-instance');
const chalk = require('chalk');
const checkValidInstall = require('./check-valid-install');

const isRoot = dir => dirname(dir) === dir;

const die = (name) => {
    console.error(`${chalk.yellow('Working directory is not a recognisable Ghost installation.')}
Run \`ghost ${name}\` again within a folder where Ghost was installed with Ghost-CLI.`);
    process.exit(1);
};

function findValidInstallation(name = '', recursive = false) {
    let dir = process.cwd();

    while (!isRoot(dir)) {
        debug(`Checking valid install: ${dir}`);
        const isValidInstall = checkValidInstall(name, dir);

        if (isValidInstall) {
            process.chdir(dir);
            return;
        }

        if (isValidInstall === false) {
            process.exit(1);
        }

        if (!recursive) {
            die(name);
            return;
        }

        debug(`Going up...`);
        dir = dirname(dir);
    }

    die(name);
}

module.exports = findValidInstallation;
