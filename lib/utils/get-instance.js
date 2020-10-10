const checkValidInstall = require('./check-valid-install');
const {SystemError} = require('../errors');

function getInstance(instanceName, system, commandName) {
    const instance = system.getInstance(instanceName);

    if (instanceName) {
        if (!instance) {
            throw new SystemError(`Ghost instance '${instanceName}' does not exist`);
        }

        process.chdir(instance.dir);
    }

    checkValidInstall(commandName);

    return instance;
}

module.exports = getInstance;
