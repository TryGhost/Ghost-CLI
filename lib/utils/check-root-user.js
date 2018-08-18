'use strict';

const os = require('os');
const chalk = require('chalk');
const fs = require('fs');

const isRootInstall = function isRootInstall() {
    const path = require('path');
    const cliFile = path.join(process.cwd(), '.ghost-cli');

    return fs.existsSync(cliFile) && fs.statSync(cliFile).uid === 0;
};

function checkRootUser(command) {
    const allowedCommands = ['stop', 'start', 'restart'];
    const isOneClickInstall = fs.existsSync('/root/.digitalocean_password');

    if (os.platform() !== 'linux' || process.getuid() !== 0) {
        return;
    }

    if (isOneClickInstall) {
        // We have a Digitalocean one click installation
        if (!isRootInstall()) {
            // CASE: the user uses either the new DO image, where installations are following our setup guid (aka not-root),
            // or the user followed the fix root user guide already, but the user uses root to run the command
            console.error(`${chalk.yellow('Can\'t run command as \'root\' user.')}
Please use the user you set up in the installation process, or create a new user with regular account privileges and use this user to run 'ghost ${command}'.
See ${chalk.underline.green('https://docs.ghost.org/docs/install#section-create-a-new-user')} for more information\n`);
        } else {
            // CASE: the ghost installation folder is owned by root. The user needs to migrate the installation
            // to a non-root and follow the instructions.
            console.error(`${chalk.yellow('We discovered that you are using the Digitalocean One-Click install.')}
You need to create a user with regular account privileges and migrate your installation to use this user.
Please follow the steps here: ${chalk.underline.green('https://docs.ghost.org/docs/troubleshooting#section-fix-root-user')} to fix your setup.\n`);
        }

        // TODO: remove this 4 versions after 1.5.0
        if (allowedCommands.includes(command)) {
            return;
        }
    } else if (isRootInstall()) {
        console.error(`${chalk.yellow('It seems Ghost was installed using the root user.')}
You need to create a user with regular account privileges and migrate your installation to use this user.
Please follow the steps here: ${chalk.underline.green('https://docs.ghost.org/docs/troubleshooting#section-fix-root-user')} to fix your setup.\n`);

        // TODO: remove this 4 versions after 1.5.0
        if (allowedCommands.includes(command)) {
            return;
        }
    } else {
        console.error(`${chalk.yellow('Can\'t run command as \'root\' user.')}
Please use the user you set up in the installation process, or create a new user with regular account privileges and use this user to run 'ghost ${command}'.
See ${chalk.underline.green('https://docs.ghost.org/docs/install#section-create-a-new-user')} for more information\n`);
    }

    process.exit(1);
}

module.exports = checkRootUser;
