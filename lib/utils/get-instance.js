const {SystemError} = require('../errors');
const findValidInstallation = require('./find-valid-install');

/**
 * @param {object} options
 * @param {string} options.name
 * @param {import('../system.js')} options.system
 * @param {string} options.command
 * @param {boolean} options.recurse
 */
function getInstance({
    name: instanceName,
    system,
    command: commandName,
    recurse
}) {
    if (instanceName) {
        const instance = system.getInstance(instanceName);
        if (!instance) {
            throw new SystemError(`Ghost instance '${instanceName}' does not exist`);
        }

        process.chdir(instance.dir);
        return instance;
    }

    findValidInstallation(commandName, recurse);
    return system.getInstance();
}

module.exports = getInstance;
