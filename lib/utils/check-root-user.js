'use strict';

const os = require('os');
const chalk = require('chalk');

function checkRootUser() {
    // Skip if we're on windows
    if (os.platform() !== 'linux') {
        return;
    }

    if (process.getuid() === 0) {
        console.error(`${chalk.yellow('Can\'t run command as \'root\' user.')}
Please create a new user with regular account privileges and use this user to run the command.
See ${chalk.underline.blue('https://docs.ghost.org/docs/install#section-create-a-new-user')} for more information`);

        process.exit(1);
    }
}

module.exports = checkRootUser;
