'use strict';

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

/**
 * Checks if the cwd is a valid ghost installation. Also checks if the current
 * directory contains a development install of ghost (e.g. a git clone), and outputs
 * a helpful error message if so.
 *
 * @param {string} name Name of command, will be output if there's an issue
 * @param {bool} exitOnError Whether to exit or throw an error if there's an issue
 */
function checkValidInstall(name, exit = true) {
    /*
     * CASE: a `config.js` file exists, which means this is a LTS installation
     * which we don't support in the CLI
     */
    if (fs.existsSync(path.join(process.cwd(), 'config.js'))) {
        console.error(`${chalk.yellow('Ghost-CLI only works with Ghost versions >= 1.0.0.')}
If you are trying to upgrade Ghost LTS to 1.0.0, refer to ${chalk.blue.underline('https://ghost.org/faq/upgrade-to-ghost-1-0/')}.
Otherwise, run \`ghost ${name}\` again within a valid Ghost installation.`);

        if (exit) {
            process.exit(1);
        }

        throw new Error('UNSUPPORTED');
    }

    /*
    * We assume it's a Ghost development install if 3 things are true:
    * 1) package.json exists
    * 2) package.json "name" field is "ghost"
    * 3) Gruntfile.js exists
    */
    if (fs.existsSync(path.join(process.cwd(), 'package.json')) &&
        fs.readJsonSync(path.join(process.cwd(), 'package.json')).name === 'ghost' &&
        fs.existsSync(path.join(process.cwd(), 'Gruntfile.js'))
    ) {
        console.error(`${chalk.yellow('Ghost-CLI commands do not work inside of a git clone, zip download or with Ghost <1.0.0.')}
Perhaps you meant \`grunt ${name}\`?
Otherwise, run \`ghost ${name}\` again within a valid Ghost installation.`);

        if (exit) {
            process.exit(1);
        }

        throw new Error('DEVELOPMENT');
    }

    /*
     * Assume it's not a valid CLI install if the `.ghost-cli` file doesn't exist
     */
    if (!fs.existsSync(path.join(process.cwd(), '.ghost-cli'))) {
        // We only want to warn if we should exit - if we traverse up the filesystem, every directory
        // that's not a valid ghost install will fail
        if (exit) {
            console.error(`${chalk.yellow('Working directory is not a recognisable Ghost installation.')}
Run \`ghost ${name}\` again within a folder where Ghost was installed with Ghost-CLI.`);
            process.exit(1);
        }

        throw new Error('NO_CONFIG');
    }
}

module.exports = checkValidInstall;
