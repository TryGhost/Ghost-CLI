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
 * @param {boolean} dir directory to check
 * @returns {boolean | null} If the directory contains a valid installation. Returns null for non-deterministic results
 */
function checkValidInstall(name, dir = process.cwd()) {
    /*
     * CASE: a `config.js` file exists, which means this is a LTS installation
     * which we don't support in the CLI
     */
    if (fs.existsSync(path.join(dir, 'config.js'))) {
        console.error(`${chalk.yellow('Ghost-CLI only works with Ghost versions >= 1.0.0.')}
If you are trying to upgrade Ghost LTS to 1.0.0, refer to ${chalk.blue.underline('https://ghost.org/faq/upgrade-to-ghost-1-0/')}.
Otherwise, run \`ghost ${name}\` again within a valid Ghost installation.`);

        return false;
    }

    /*
     * We assume it's a Ghost development install if 3 things are true:
     * 1) package.json exists
     * 2) package.json "name" field is "ghost"
     * 3) Gruntfile.js exists
    */
    if (fs.existsSync(path.join(dir, 'package.json')) &&
        fs.readJsonSync(path.join(dir, 'package.json')).name === 'ghost' &&
        fs.existsSync(path.join(dir, 'Gruntfile.js'))
    ) {
        console.error(`${chalk.yellow('Ghost-CLI commands do not work inside of a git clone, zip download or with Ghost <1.0.0.')}
Perhaps you meant \`grunt ${name}\`?
Otherwise, run \`ghost ${name}\` again within a valid Ghost installation.`);

        return false;
    }

    /*
     * Assume it's not a valid CLI install if the `.ghost-cli` file doesn't exist
     */
    if (!fs.existsSync(path.join(dir, '.ghost-cli'))) {
        return null;
    }

    return true;
}

module.exports = checkValidInstall;
