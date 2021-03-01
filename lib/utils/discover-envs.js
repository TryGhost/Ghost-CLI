// @ts-check
const fs = require('fs');

const environmentExtractor = /config\.(.*)\.json/;

/**
 * @param {string} cwd the directory to search
 * @returns {string[]} list of environments discovered
 */
module.exports = function discoverEnvironments(cwd) {
    const environments = [];
    const directoryContents = fs.readdirSync(cwd);

    for (const entry of directoryContents) {
        const matchResult = environmentExtractor.exec(entry);

        if (matchResult) {
            environments.push(matchResult[1]);
        }
    }

    // Always return in order: production, development, anything else
    let indexPointer = environments.indexOf('development');
    if (indexPointer !== -1) {
        environments.unshift('development');
        environments.splice(indexPointer + 1, 1);
    }

    indexPointer = environments.indexOf('production');
    if (indexPointer !== -1) {
        environments.unshift('production');
        environments.splice(indexPointer + 1, 1);
    }

    return environments;
};
