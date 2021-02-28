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
    return environments.sort((left, right) => {
        if (left === 'production') {
            return -1;
        }

        if (left === 'development' && right === 'production') {
            return 1;
        }

        if (left === 'development') {
            return -1;
        }

        return 0;
    });
};
